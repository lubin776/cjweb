function cleanEpisodes(playUrlStr) {
  if (!playUrlStr) return "";

  const groups = playUrlStr.split("$$$");
  const cleanedGroups = [];

  for (let g = 0; g < groups.length; g++) {
    const episodes = groups[g].split("#");
    const validEpisodes = [];

    for (let e = 0; e < episodes.length; e++) {
      const parts = episodes[e].split("$");
      let epName = "";
      let epUrl = "";

      if (parts.length > 0) epName = parts[0];
      if (parts.length > 1) epUrl = parts[1];

      let hasAdKeyword = false;
      for (let i = 0; i < AD_KEYWORDS.length; i++) {
        if (epName.indexOf(AD_KEYWORDS[i]) !== -1) {
          hasAdKeyword = true;
          break;
        }
      }

      let isInvalidUrl = false;
      if (!epUrl) {
        isInvalidUrl = true;
      } else if (epUrl.indexOf("ads") !== -1 || epUrl.indexOf("banner") !== -1) {
        isInvalidUrl = true;
      }

      if (!hasAdKeyword && !isInvalidUrl) {
        validEpisodes.push(episodes[e]);
      }
    }
    cleanedGroups.push(validEpisodes.join("#"));
  }

  const finalGroups = [];
  for (let j = 0; j < cleanedGroups.length; j++) {
    if (cleanedGroups[j].length > 0) finalGroups.push(cleanedGroups[j]);
  }
  return finalGroups.join("$$$");
}