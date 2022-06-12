import { Handler, PathData } from "./types";

/**
 * Traverses a path to collect mutationExpressions into an expression.
 * This is needed because mutations can be chained.
 *
 * Requires:
 * - a mutationExpressions property on the path proxy
 */
export default class MutationExpressionsHandler implements Handler {
  async handle(pathData: PathData) {
    const mutationExpressions = [];

    // Add all mutationExpressions to the path
    let current = pathData;
    while (current) {
      // Obtain and store mutationExpressions
      if (current.mutationExpressions)
        mutationExpressions.unshift(...await current.mutationExpressions);
      // Move to parent link
      current = current.parent;
    }

    return mutationExpressions;
  }
}
