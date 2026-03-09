import Resolver from '@forge/resolver';

const resolver = new Resolver();

resolver.define('getMessage', async () => {
  console.log("RESOLVER APPELÉ");
  return { message: "Hello World depuis le resolver !" };
});

export const handler = resolver.getDefinitions();