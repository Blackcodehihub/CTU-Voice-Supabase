// badwords.js — profanity filter for CTU Voice submissions (English, Tagalog, Cebuano)
// Edit the lists below, then re-run the INSERT in supabase-setup.sql so the server list matches.
(function (global) {
  // Matched anywhere inside a word (long/unambiguous roots: "bullshit", "fucking", "putanginamo")
  const SUBSTRING_WORDS = [
    "fuck", "shit", "bitch", "asshole", "dickhead", "faggot",
    "putangina", "potangina", "tangina", "pakshet", "pakingshet", "punyeta",
    "tarantado", "kantot", "pekpek"
  ];

  // Matched only as a whole word (plus optional s / es / ng) so "class", "assess", "cockpit" are safe
  const EXACT_WORDS = [
    "ass", "arse", "cock", "dick", "pussy", "cunt", "twat", "whore", "slut",
    "bastard", "retard", "retarded", "wanker", "douche", "douchebag",
    "nigga", "nigger",
    "puta", "pota", "gago", "gaga", "bobo", "tanga", "ulol", "leche", "bwisit",
    "buwisit", "kupal", "pakyu", "shunga", "puki", "titi", "tite", "burat",
    "jakol", "hindot", "hinayupak", "pokpok", "tamod", "pucha", "gunggong",
    "siraulo", "yawa", "piste", "pisti", "tinae", "bilat", "iyot"
  ];

  // Innocent words that would otherwise trip a pattern
  const ALLOWED_WORDS = ["shiitake", "shiitakes"];

  // Multi-word phrases (spaces allowed between the words)
  const PHRASES = ["tang ina", "pak shet"];

  // "fuuuck" -> repeated letters allowed; "ass" must keep its double s so "as" is safe
  function wordToRegexSource(w) {
    let out = "";
    for (let i = 0; i < w.length; ) {
      let n = 1;
      while (w[i + n] === w[i]) n++;
      out += w[i] + (n === 1 ? "+" : "{" + n + ",}");
      i += n;
    }
    return out;
  }

  const substringRegexes = SUBSTRING_WORDS.map(w => new RegExp(wordToRegexSource(w)));
  const exactRegexes = EXACT_WORDS.map(w => new RegExp("^" + wordToRegexSource(w) + "(?:s|es|ng)?$"));
  const phraseRegexes = PHRASES.map(p =>
    new RegExp(" " + p.split(" ").map(wordToRegexSource).join(" ") + " "));

  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

  function normalize(text) {
    return String(text)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f\u200B-\u200D\uFEFF]/g, "") // accents + zero-width characters
      .toLowerCase()
      .replace(/([a-z])!(?=[a-z])/g, "$1i")               // sh!t
      .replace(/[013457@$]/g, ch => LEET[ch]);            // f4ck, b1tch, $hit
  }

  function isBannedToken(tok) {
    return substringRegexes.some(r => r.test(tok)) || exactRegexes.some(r => r.test(tok));
  }

  // Returns true if the text contains a bad word.
  // Words the writer has already masked with asterisks (f***, b*tch) are allowed on purpose,
  // so students can quote what was said to them without being blocked.
  function containsProfanity(text) {
    if (!text) return false;
    const t = normalize(text);
    const tokens = t.split(/[^a-z]+/).filter(w => w && !ALLOWED_WORDS.includes(w));

    if (tokens.some(isBannedToken)) return true;

    const spaced = " " + tokens.join(" ") + " ";
    if (phraseRegexes.some(r => r.test(spaced))) return true;

    // Letters spread out one by one: "f u c k", "f.u.c.k"
    const runs = /(?:^|[^a-z])([a-z](?:[^a-z]+[a-z](?![a-z])){2,})/g;
    let m;
    while ((m = runs.exec(t)) !== null) {
      if (isBannedToken(m[1].replace(/[^a-z]/g, ""))) return true;
      runs.lastIndex = m.index + m[0].length - 1;
    }
    return false;
  }

  const api = { containsProfanity, SUBSTRING_WORDS, EXACT_WORDS, PHRASES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.containsProfanity = containsProfanity;
})(typeof window !== "undefined" ? window : globalThis);
