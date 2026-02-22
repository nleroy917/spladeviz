# Why SPLADE works

When SPLADE comes up in search engineering discussions, it's almost always framed around two concepts: **vocabulary mismatch** and **query expansion**. People like to sya things like, "SPLADE is like better BM25" or "SPLADE solves the vocabulary mismatch problem." And while these are certainly the problems SPLADE solves, rarely does anyone actually explain _why_ it works. It wasn't until recently that I had the epiphany that SPLADE's secret sauce is actually pretty simple: SPLADE leverages the fact that BERT encoder models are already really good at predicting masked tokens in a piece of text. By treating the query as a token prediction problem, SPLADE is able to leverage the contextual token predictions of BERT models to perform query expansion in a way that is much more effective than traditional methods.

To motivate this from the ground up, let's start with a concrete example of the problem SPLADE is trying to solve.

## A developer documentation search system

Imagine a developer documentation search system. A programmer searches for:

> "python memory management"

But the actual documentation in the system uses more specific terminology like:

> "garbage collection in CPython"
> "reference counting implementation"
> "PyObject allocation and deallocation"

A classic BM25 keyword search would partially work here—it would match on "python" and "memory"—but it would miss documents that discuss the same concepts using different terminology. A better system would take the individual tokens in our query and **expand** upon them to pull in other semantically related tokens. For example, if we could expand "memory management" to also include "garbage collection," "reference counting," and "allocation," we'd have a much better chance of retrieving all the relevant documentation. BM25 fails at this kind of expansion—it simply stems, lemmatizes, and tokenizes the query and documents, looking only for lexical overlap.

## Expanding query tokens

A naive approach to solve this problem could leverage static word embeddings. For example, one could utilize the GloVe embedding for "python" and find the top-k most similar tokens in the embedding space. While this might seem reasonable, a critical flaw is that GloVe embeddings are static—they don't take into account context. The embedding for "python" would be dominated by its most common usage across all of GloVe's training data. This means "python" would likely pull in tokens like "snake," "reptile," "constrictor," and "viper"—completely useless for our developer trying to find programming documentation.

<!-- Insert component that loads static word embeddings, and computes similarities, giving the top-k most similar tokens -->

## Leveraging contextual token predictions

The fact that GloVe and other static word embeddings are context-agnostic makes them ill-suited for query expansion. This limitation is precisely what led to the development of contextualized language models like BERT. BERT and similar models are trained on a masked language modeling (MLM) objective, meaning they learn to predict missing tokens based on surrounding context. This makes them particularly well-suited for query expansion—they can understand that "python" in "python memory management" refers to the programming language, not the animal.

When we input "python memory management" into a BERT model and ask it to predict related tokens, it understands the programming context. Instead of predicting "snake" or "reptile," it might predict tokens like "Java," "C++," "garbage," "heap," or "allocation"—terms that actually appear in similar programming contexts. The model has learned from its training data that these tokens co-occur with "python" when discussing software development, not zoology.

<!-- Insert component that takes a query, masks out tokens, and uses a BERT model to predict the top-k most likely tokens for each masked token -->

## From BERT token predictions to SPLADE sparse vectors

SPLADE takes this idea of leveraging BERT's contextual token predictions and applies it in a very specific way to create sparse vector representations of queries and documents. Instead of just taking the top-k predicted tokens for each masked token in the query, SPLADE actually uses the full distribution of predicted tokens and their associated probabilities to create a sparse vector representation. Each dimension in the sparse vector corresponds to a token in the vocabulary, and the value in that dimension is the probability that the BERT model assigns to that token being relevant to the query. This allows SPLADE to create a much richer and more nuanced representation of the query that takes into account the full range of related tokens and their relevance, rather than just a binary indicator of whether a token is present or not. This is what gives SPLADE its power in solving the vocabulary mismatch problem and performing effective query expansion.

## Conclusion

In summary, SPLADE works because it leverages the contextual token prediction capabilities of BERT models to perform query expansion in a way that is much more effective than traditional methods. By treating the query as a token prediction problem and using the full distribution of predicted tokens to create sparse vector representations, SPLADE is able to capture the nuanced relationships between tokens and create much richer representations of queries and documents. This allows it to solve the vocabulary mismatch problem and retrieve relevant documents even when there is little to no lexical overlap between the query and the documents.\*
