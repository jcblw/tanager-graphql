import { graphql, GraphQLSchema, DocumentNode, print } from "graphql";
import gql from "graphql-tag";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { isDocumentNode } from "./utils";
import {
  FinchApiOptions,
  GenericVariables,
  FinchMessage,
  FinchMessageKey,
  FinchContext,
  FinchMessageSource,
  FinchContextObj,
} from "./types";
import { addExteneralMessageListener, addMessageListener } from "./browser";

export class FinchApi {
  schema: GraphQLSchema;
  context: FinchContext;
  onQueryResponse: FinchApiOptions["onQueryResponse"];
  messageKey?: string;
  constructor({
    context,
    attachMessages,
    attachExternalMessages,
    messageKey,
    onQueryResponse = () => {},
    ...options
  }: FinchApiOptions) {
    this.schema = makeExecutableSchema(options);
    this.context = context ?? { source: FinchMessageSource.Internal };
    this.messageKey = messageKey;
    this.onQueryResponse = onQueryResponse;

    this.onMessage = this.onMessage.bind(this);
    this.onExternalMessage = this.onExternalMessage.bind(this);

    if (attachMessages) {
      addMessageListener(this.onMessage);
    }
    if (attachExternalMessages) {
      addExteneralMessageListener(this.onExternalMessage);
    }
  }

  private getContext(baseContext?: FinchContextObj) {
    return typeof this.context === "function"
      ? this.context(baseContext)
      : {
          source: FinchMessageSource.Internal,
          ...this.context,
          ...(baseContext ?? {}),
        };
  }

  isQueryDocumentNode(query: string | DocumentNode): query is DocumentNode {
    return typeof query === "object";
  }

  private documentNodeToString(query: DocumentNode) {
    return print(query);
  }

  async query<Query extends {}, Variables extends GenericVariables>(
    query: string | DocumentNode,
    variables?: Variables,
    baseContext?: FinchContextObj
  ) {
    const context = this.getContext(baseContext);
    const documentNode = isDocumentNode(query) ? query : gql(query);
    const queryStr = isDocumentNode(query)
      ? this.documentNodeToString(query)
      : query;

    let operationName = undefined;
    const operationDef = documentNode.definitions.find(
      (def) => def.kind === "OperationDefinition"
    );
    if (operationDef && "name" in operationDef) {
      operationName = operationDef?.name?.value ?? undefined;
    }

    const ts = performance.now();

    const response = await graphql(
      this.schema,
      queryStr,
      { root: true },
      context,
      variables,
      operationName
    );

    const timeTaken = Math.round(performance.now() - ts);

    // NOTE: This ensure not outside code breaks this functionality
    try {
      this.onQueryResponse({
        query: documentNode,
        variables,
        context,
        timeTaken,
        operationName,
        response,
      });
    } catch (e) {
      console.warn(e);
    }

    return response;
  }

  onMessage(message: FinchMessage, sender?: browser.runtime.MessageSender) {
    const messageKey = this.messageKey ?? FinchMessageKey.Generic;
    if (message.type === messageKey && message.query) {
      const { variables, query } = message;
      return this.query(query, variables ?? {}, {
        source: FinchMessageSource.Message,
        sender,
      });
    }
  }

  onExternalMessage(
    message: FinchMessage,
    sender?: browser.runtime.MessageSender
  ) {
    const messageKey = this.messageKey ?? FinchMessageKey.Generic;
    if (message.type === messageKey && message.query) {
      const { variables, query } = message;
      return this.query(query, variables ?? {}, {
        source: FinchMessageSource.ExternalMessage,
        sender,
      });
    }
  }
}
