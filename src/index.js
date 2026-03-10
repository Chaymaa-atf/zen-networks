import Resolver from '@forge/resolver';

const resolver = new Resolver();

resolver.define('getMessage', async () => {
  return { message: 'Hello World !' };
});

export const handler = resolver.getDefinitions();