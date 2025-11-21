/**
 * Type declaration for gremlin module
 * Allows TypeScript to compile without type errors
 */
declare module 'gremlin' {
  const gremlin: {
    driver: any;
    structure: any;
    process: any;
  };
  export = gremlin;
}
