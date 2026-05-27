const PREPOSITIONS = new Set(['de','da','do','das','dos','e','com','para','a','o','as','os','em','no','na','nos','nas','por','pelo','pela','pelos','pelas','ao','à','aos','às','um','uma','uns','umas'])

export function toTitleCase(str: string): string {
  if (!str) return str
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (!word) return word
      if (i !== 0 && PREPOSITIONS.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function fixAccents(str: string): string {
  // Common corrections for all-caps Brazilian Portuguese
  return str
    .replace(/\bFRANGO\b/gi, 'Frango')
    .replace(/\bQUEIJO\b/gi, 'Queijo')
    .replace(/\bCAMARAO\b/gi, 'Camarão')
    .replace(/\bPORCAO\b/gi, 'Porção')
    .replace(/\bPORCAO\b/gi, 'Porção')
    .replace(/\bFEIJAO\b/gi, 'Feijão')
    .replace(/\bPAO\b/gi, 'Pão')
    .replace(/\bMACA\b/gi, 'Maçã')
    .replace(/\bCEBOLA\b/gi, 'Cebola')
    .replace(/\bSALSAO\b/gi, 'Salsão')
    .replace(/\bCOGUMELO\b/gi, 'Cogumelo')
    .replace(/\bCALABRESA\b/gi, 'Calabresa')
    .replace(/\bLINGUACA\b/gi, 'Linguiça')
    .replace(/\bBACALHAU\b/gi, 'Bacalhau')
    .replace(/\bGRAO\b/gi, 'Grão')
    .replace(/\bSALGADO\b/gi, 'Salgado')
    .replace(/\bCHURROS\b/gi, 'Churros')
    .replace(/\bPIZZA\b/gi, 'Pizza')
    .replace(/\bPOLENTA\b/gi, 'Polenta')
    .replace(/\bKIBE\b/gi, 'Kibe')
    .replace(/\bRISOLIS\b/gi, 'Risolis')
    .replace(/\bESFIHA\b/gi, 'Esfiha')
    .replace(/\bCOXINHA\b/gi, 'Coxinha')
    .replace(/\bPASTEL\b/gi, 'Pastel')
    .replace(/\bCURRYMINHO\b/gi, 'Curryminho')
    .replace(/\bBURGUER\b/gi, 'Burguer')
    .replace(/\bHAMBURGUER\b/gi, 'Hamburguer')
    .replace(/\bBAMBUE\b/gi, 'Bambué')
}
