import { queryApi } from "../client";
import { DocumentNode, GraphQLFormattedError } from "graphql";
import { useState, useEffect, useCallback, useRef } from "react";
import { useExtension } from "./ExtensionProvider";

interface BackgroundQueryOptions<V> {
  variables?: V;
  skip?: Boolean;
}

type QueryError = GraphQLFormattedError | Error;

export const useQuery = <T, V>(
  query: DocumentNode,
  { skip, variables }: BackgroundQueryOptions<V> = {}
) => {
  const { id } = useExtension();
  const mounted = useRef(true);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<QueryError | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const makeQuery = useCallback(
    async (argVars?: V) => {
      try {
        const resp = await queryApi<T, V>(
          query,
          // @ts-ignore variables are kinda weird
          argVars ?? variables ?? {},
          id
        );

        if (resp.data && mounted.current) {
          setData(resp.data);
        }
        if (resp.errors && resp.errors.length) {
          setError(resp.errors[0]);
        }
      } catch (e) {
        if (mounted.current) {
          setError(e);
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    },
    [query, variables]
  );

  useEffect(() => {
    if (!skip) {
      setLoading(true);
      makeQuery();
    }
  }, [query, skip]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return {
    data,
    error,
    loading,
    refetch: makeQuery,
  };
};
