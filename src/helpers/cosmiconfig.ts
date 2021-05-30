import {
  cosmiconfig,
  cosmiconfigSync,
  Loader,
  defaultLoaders,
} from 'cosmiconfig';
import {loadToml} from 'cosmiconfig-toml-loader';
import {env} from 'string-env-interpolation';

export interface ConfigSearchResult {
  config: any;
  filepath: string;
  isEmpty?: boolean;
}

const legacySearchPlaces = [
  '.graphqlconfig',
  '.graphqlconfig.json',
  '.graphqlconfig.yaml',
  '.graphqlconfig.yml',
];

function isTsLoaderInstalled(): boolean {
  try {
    require.resolve("@endemolshinegroup/cosmiconfig-typescript-loader");
  } catch(e) {
      return false;
  }
  return true;
}

export function isLegacyConfig(filepath: string): boolean {
  filepath = filepath.toLowerCase();

  return legacySearchPlaces.some((name) => filepath.endsWith(name));
}

function transformContent(content: string): string {
  return env(content);
}

const createCustomLoader = (loader: Loader): Loader => {
  return (filepath, content) => {
    return loader(filepath, transformContent(content));
  };
};

export function createCosmiConfig(
  moduleName: string,
  {
    legacy,
  }: {
    legacy: boolean;
  },
) {
  const options = prepareCosmiconfig(moduleName, {
    legacy,
  });

  return cosmiconfig(moduleName, options);
}

export function createCosmiConfigSync(
  moduleName: string,
  {legacy}: {legacy: boolean},
) {
  const options = prepareCosmiconfig(moduleName, {
    legacy,
  });

  return cosmiconfigSync(moduleName, options);
}

function prepareCosmiconfig(moduleName: string, {legacy}: {legacy: boolean}) {
  const loadYaml = createCustomLoader(defaultLoaders['.yaml']);
  const loadTomlCustom = createCustomLoader(loadToml);
  const loadJson = createCustomLoader(defaultLoaders['.json']);
  const shouldLoadTs = isTsLoaderInstalled();

  const searchPlaces = [
    `#.config.js`,
    '#.config.json',
    '#.config.yaml',
    '#.config.yml',
    '#.config.toml',
    '.#rc',
    '.#rc.js',
    '.#rc.json',
    '.#rc.yml',
    '.#rc.yaml',
    '.#rc.toml',
    'package.json',
  ];

  if(shouldLoadTs) {
    searchPlaces.push('#.config.ts', '.#rc.ts');
  }

  if (legacy) {
    searchPlaces.push(...legacySearchPlaces);
  }

  const loaders = {
    '.js': defaultLoaders['.js'],
    '.json': loadJson,
    '.yaml': loadYaml,
    '.yml': loadYaml,
    '.toml': loadTomlCustom,
    noExt: loadYaml,
  };

  if (shouldLoadTs) {
    loaders['.ts'] = require('@endemolshinegroup/cosmiconfig-typescript-loader').default;
  }


  // We need to wrap loaders in order to access and transform file content (as string)
  // Cosmiconfig has transform option but at this point config is not a string but an object
  return {
    searchPlaces: searchPlaces.map((place) => place.replace('#', moduleName)),
    loaders,
  };
}
