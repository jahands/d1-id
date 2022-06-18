export type Results<Type> = {
  results: Type[];
};
export function hasResults<Type>(data: any): data is Results<Type> {
  return data.results !== undefined && data.results.length > 0;
}

// Get current timestamp in milliseconds
export const now = () => new Date().getTime();
export function missingParams() {
  return Response.json(
    { error: `missing params` },
    {
      status: 400,
    }
  );
}
export function alreadyExists(name: string) {
  return Response.json(
    { error: `${name} already exists` },
    {
      status: 400,
    }
  );
}
export function notExists(name: string) {
  return Response.json(
    { error: `${name} does not exists` },
    {
      status: 400,
    }
  );
}
