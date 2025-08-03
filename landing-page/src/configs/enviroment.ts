const ENV: ImportMetaEnv = import.meta.env;

const parseENV: { [key: string]: string } = {};

Object.entries(ENV).map((env) => {
  if (env[0].includes('VITE')) {
    parseENV[env[0]] = env[1]
  }
});

// env name variable
export const { VITE_API_ENDPOINT } = parseENV;
