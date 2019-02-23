import SparqlHandler from '../../src/SparqlHandler';
import { namedNode, literal, blankNode, defaultGraph, variable } from '@rdfjs/data-model';

import { deindent } from '../util';

describe('a SparqlHandler instance', () => {
  let handler;
  beforeAll(() => handler = new SparqlHandler());

  it('errors with empty mutationExpressions and when no pathExpression is present', async () => {
    const mutationExpressions = [];
    const pathData = { toString: () => 'path' };

    await expect(handler.handle(pathData, { mutationExpressions })).rejects
      .toThrow(new Error('path has no pathExpression property'));
  });

  it('errors when no pathExpression is present', async () => {
    const pathData = { toString: () => 'path' };

    await expect(handler.handle(pathData, {})).rejects
      .toThrow(new Error('path has no pathExpression property'));
  });

  describe('when converting a term to string', () => {
    it('should convert a NamedNode', async () => {
      await expect(handler.termToQueryString(namedNode('http://example.org')))
        .toEqual('<http://example.org>');
    });

    it('should convert a Literal', async () => {
      await expect(handler.termToQueryString(literal('abc')))
        .toEqual('"abc"');
    });

    it('should convert a Literal that should be escaped', async () => {
      await expect(handler.termToQueryString(literal('a"bc')))
        .toEqual('"a\\"bc"');
    });

    it('should convert a BlankNode', async () => {
      await expect(handler.termToQueryString(blankNode('abc')))
        .toEqual('_:abc');
    });

    it('should error on DefaultGraph', async () => {
      await expect(() => handler.termToQueryString(defaultGraph()))
        .toThrow(new Error('Could not convert a term of type DefaultGraph'));
    });

    it('should error on Variable', async () => {
      await expect(() => handler.termToQueryString(variable('v')))
        .toThrow(new Error('Could not convert a term of type Variable'));
    });
  });

  describe('with a pathExpression', () => {
    it('errors with a path of length 0', async () => {
      const pathExpression = [
        { subject: namedNode('https://example.org/#me') },
      ];
      const pathData = { toString: () => 'path' };

      await expect(handler.handle(pathData, { pathExpression })).rejects
        .toThrow(new Error('path should at least contain a subject and a predicate'));
    });

    it('resolves a path of length 1', async () => {
      const pathExpression = [
        { subject: namedNode('https://example.org/#me') },
        { predicate: namedNode('https://ex.org/p1') },
      ];
      const pathData = { property: 'p1' };

      expect(await handler.handle(pathData, { pathExpression })).toEqual(deindent(`
      SELECT ?p1 WHERE {
        <https://example.org/#me> <https://ex.org/p1> ?p1.
      }`));
    });

    it('resolves a path of length 3', async () => {
      const pathExpression = [
        { subject: namedNode('https://example.org/#me') },
        { predicate: namedNode('https://ex.org/p1') },
        { predicate: namedNode('https://ex.org/p2') },
        { predicate: namedNode('https://ex.org/p3') },
      ];
      const pathData = { property: 'p3' };

      expect(await handler.handle(pathData, { pathExpression })).toEqual(deindent(`
      SELECT ?p3 WHERE {
        <https://example.org/#me> <https://ex.org/p1> ?v0.
        ?v0 <https://ex.org/p2> ?v1.
        ?v1 <https://ex.org/p3> ?p3.
      }`));
    });

    it('resolves a path with an property name ending in a non-word', async () => {
      const pathExpression = [
        { subject: namedNode('https://example.org/#me') },
        { predicate: namedNode('https://ex.org/p1') },
      ];
      const pathData = { property: '/x/' };

      expect(await handler.handle(pathData, { pathExpression })).toEqual(deindent(`
      SELECT ?result WHERE {
        <https://example.org/#me> <https://ex.org/p1> ?result.
      }`));
    });
  });

  describe('with mutationExpressions', () => {
    describe('with one INSERT expression', () => {
      it('resolves with domain of length 0 and range of length of 0', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: namedNode('https://example.org/#R0') }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT DATA {
        <https://example.org/#D0> <https://example.org/p> <https://example.org/#R0>
      }`));
      });

      it('resolves with domain of length 0 and range of length of 0 with literal', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: literal('Ruben') }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT DATA {
        <https://example.org/#D0> <https://example.org/p> "Ruben"
      }`));
      });

      it('resolves with domain of length 0 and range of length 0 with multiple terms', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{
              subject: [
                namedNode('https://example.org/#R0'),
                literal('Ruben'),
                literal('Other'),
              ],
            }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT DATA {
        <https://example.org/#D0> <https://example.org/p> <https://example.org/#R0>, "Ruben", "Other"
      }`));
      });

      it('resolves with domain of length 2 and range of length of 0', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [
              { subject: namedNode('https://example.org/#D0') },
              { predicate: namedNode('https://example.org/#Dp1') },
              { predicate: namedNode('https://example.org/#Dp2') },
            ],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: namedNode('https://example.org/#R0') }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT {
        ?Dp2 <https://example.org/p> <https://example.org/#R0>
      } WHERE {
        <https://example.org/#D0> <https://example.org/#Dp1> ?v0.
        ?v0 <https://example.org/#Dp2> ?Dp2.
      }`));
      });

      it('resolves with domain of length 1 with exotic predicate and range of length of 0', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [
              { subject: namedNode('https://example.org/#D0') },
              { predicate: namedNode('https://example.org/#') },
            ],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: namedNode('https://example.org/#R0') }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT {
        ?result <https://example.org/p> <https://example.org/#R0>
      } WHERE {
        <https://example.org/#D0> <https://example.org/#> ?result.
      }`));
      });

      it('resolves with domain of length 0 and range of length of 2', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [
              { subject: namedNode('https://example.org/#R0') },
              { predicate: namedNode('https://example.org/#Rp1') },
              { predicate: namedNode('https://example.org/#Rp2') },
            ],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT {
        <https://example.org/#D0> <https://example.org/p> ?Rp2
      } WHERE {
        <https://example.org/#R0> <https://example.org/#Rp1> ?v0.
        ?v0 <https://example.org/#Rp2> ?Rp2.
      }`));
      });

      it('resolves with domain of length 2 and range of length of 2', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [
              { subject: namedNode('https://example.org/#D0') },
              { predicate: namedNode('https://example.org/#Dp1') },
              { predicate: namedNode('https://example.org/#Dp2') },
            ],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [
              { subject: namedNode('https://example.org/#R0') },
              { predicate: namedNode('https://example.org/#Rp1') },
              { predicate: namedNode('https://example.org/#Rp2') },
            ],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT {
        ?Dp2 <https://example.org/p> ?Rp2
      } WHERE {
        <https://example.org/#D0> <https://example.org/#Dp1> ?v0.
        ?v0 <https://example.org/#Dp2> ?Dp2.
        <https://example.org/#R0> <https://example.org/#Rp1> ?v0_0.
        ?v0_0 <https://example.org/#Rp2> ?Rp2.
      }`));
      });
    });

    describe('with one INSERT expression that has a range that should be escaped', () => {
      it('resolves with domain of length 0 and range of length of 0', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: literal('a"b') }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT DATA {
        <https://example.org/#D0> <https://example.org/p> "a\\"b"
      }`));
      });
    });

    describe('with one DELETE expression', () => {
      it('resolves with domain of length 0 and range of length of 0', async () => {
        const mutationExpressions = [
          {
            mutationType: 'DELETE',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: namedNode('https://example.org/#R0') }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      DELETE DATA {
        <https://example.org/#D0> <https://example.org/p> <https://example.org/#R0>
      }`));
      });
    });

    it('resolves with domain of length 0 and range of length 0 with multiple terms', async () => {
      const mutationExpressions = [
        {
          mutationType: 'DELETE',
          domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
          predicate: namedNode('https://example.org/p'),
          rangeExpression: [{
            subject: [
              namedNode('https://example.org/#R0'),
              literal('Ruben'),
              literal('Other'),
            ],
          }],
        },
      ];

      expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
    DELETE DATA {
        <https://example.org/#D0> <https://example.org/p> <https://example.org/#R0>, "Ruben", "Other"
      }`));
    });

    describe('with one DELETE expression without range', () => {
      it('resolves with domain of length 0 and range of length of 0', async () => {
        const mutationExpressions = [
          {
            mutationType: 'DELETE',
            domainExpression: [
              { subject: namedNode('https://example.org/#D0') },
              { predicate: namedNode('https://example.org/#Dp1') },
            ],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      DELETE {
        <https://example.org/#D0> <https://example.org/#Dp1> ?Dp1
      } WHERE {
        <https://example.org/#D0> <https://example.org/#Dp1> ?Dp1.
      }`));
      });
    });

    describe('with multiple expressions', () => {
      it('resolves with queries separated by semicolons', async () => {
        const mutationExpressions = [
          {
            mutationType: 'INSERT',
            domainExpression: [
              { subject: namedNode('https://example.org/#D0') },
              { predicate: namedNode('https://example.org/#Dp1') },
              { predicate: namedNode('https://example.org/#Dp2') },
            ],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [
              { subject: namedNode('https://example.org/#R0') },
              { predicate: namedNode('https://example.org/#Rp1') },
              { predicate: namedNode('https://example.org/#Rp2') },
            ],
          },
          {
            mutationType: 'DELETE',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: namedNode('https://example.org/#R0') }],
          },
          {
            mutationType: 'INSERT',
            domainExpression: [{ subject: namedNode('https://example.org/#D0') }],
            predicate: namedNode('https://example.org/p'),
            rangeExpression: [{ subject: namedNode('https://example.org/#R0') }],
          },
        ];

        expect(await handler.handle({}, { mutationExpressions })).toEqual(deindent(`
      INSERT {
        ?Dp2 <https://example.org/p> ?Rp2
      } WHERE {
        <https://example.org/#D0> <https://example.org/#Dp1> ?v0.
        ?v0 <https://example.org/#Dp2> ?Dp2.
        <https://example.org/#R0> <https://example.org/#Rp1> ?v0_0.
        ?v0_0 <https://example.org/#Rp2> ?Rp2.
      }
      ;
      DELETE DATA {
        <https://example.org/#D0> <https://example.org/p> <https://example.org/#R0>
      }
      ;
      INSERT DATA {
        <https://example.org/#D0> <https://example.org/p> <https://example.org/#R0>
      }`));
      });
    });
  });

  describe('#getQueryVar', () => {
    it('returns the suggestion for an empty scope', () => {
      const variableScope = {};
      const queryVar = handler.getQueryVar('a', variableScope);
      expect(queryVar).toEqual('a');
      expect(variableScope).toEqual({ a: true });
    });

    it('returns the suggestion for a scope without matches', () => {
      const variableScope = { b: true };
      const queryVar = handler.getQueryVar('a', variableScope);
      expect(queryVar).toEqual('a');
      expect(variableScope).toEqual({ b: true, a: true });
    });

    it('returns an incremented label for a scope with 1 match', () => {
      const variableScope = { a: true };
      const queryVar = handler.getQueryVar('a', variableScope);
      expect(queryVar).toEqual('a_0');
      expect(variableScope).toEqual({ 'a': true, 'a_0': true }); // eslint-disable-line quote-props
    });

    it('returns an incremented label for a scope with 3 matches', () => {
      const variableScope = { 'a': true, 'a_0': true, 'a_1': true, 'a_2': true }; // eslint-disable-line quote-props
      const queryVar = handler.getQueryVar('a', variableScope);
      expect(queryVar).toEqual('a_3');
      expect(variableScope).toEqual({ 'a': true, 'a_0': true, 'a_1': true, 'a_2': true, 'a_3': true }); // eslint-disable-line quote-props
    });
  });
});
