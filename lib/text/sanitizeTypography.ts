export const sanitizeTypography = (input: string) => {
  // Replace common unicode dash characters with a plain hyphen.
  // This helps avoid stylistic unicode dashes leaking into UI/AI output.
  return input.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-");
};

