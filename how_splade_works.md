# Why SPLADE works
When SPLADE comes up in search engineering discussions, it's almost always framed around two concepts: **vocabulary mismatch** and **query expansion**. People like to sya things like, "SPLADE is like better BM25" or "SPLADE solves the vocabulary mismatch problem." And while these are certainly the problems SPLADE solves, rarely does anyone actually explain *why* it works. It wasn't until recently that I had the epiphany that SPLADE's secret sauce is actually pretty simple: SPLADE leverages the fact that BERT encoder models are already really good at predicting masked tokens in a piece of text. By treating the query as a token prediction problem, SPLADE is able to leverage the contextual token predictions of BERT models to perform query expansion in a way that is much more effective than traditional methods.

To motivate this from the ground up, let's start with a concrete example of the problem SPLADE is trying to solve.

## A hospital internal document search system
Imagine a hospital's internal document search system. A nurse searches for:
> "heart attack treatment protocol"

But the actual clinical documents in the system consistently use terminology like:

> "myocardial infarction management guidelines"
> "STEMI intervention procedure"
> "acute coronary syndrome care pathway"

A classic BM25 keyword search would largely fail here. The tokens "heart attack" don't overlap lexically with "myocardial infarction," so those documents score low or don't appear at all. A better system would take the individual tokens in our query and **expand** upon them to pull in other similarly related tokens that might be useful to our query. For example, if we could expand "heart attack" to also include "myocardial infarction," "STEMI," and "acute coronary syndrome," then we would have a much better chance of retrieving the relevant clinical documents. BM25 fails because it doesn't have a way to do this kind of expansion. It simply stems, lemmatizes, and tokenizes the query and documents and looks for lexical overlap.

<!-- Insert component that lets us tokenize queries and visualize reultant tokens with the selected model -->

## Expanding query tokens
A naive approach tosolve this problem could simply leverage static word embeddings. For example, one could utilize the GloVe embedding for "heart attack" and find the top-k most similar tokens in the embedding space. While it's possible that this would work, a critical flaw of this approach is that the GloVe embeddings for the tokens "heart" and "attack" are static. They don't take into account the context of the query. For example, "heart" most likely pulls in medically irrelevant tokens like "love" or "cardio" and "attack" might pull in tokens like "defend" or "assault". These would be no more helpful to our nurse in finding the right clinical documents.

<!-- Insert component that loads static word embeddings, and computes similarities, giving the top-k most similar tokens -->

## Leveraging contextual token predictions
The fact that GloVe and other static word embeddings are context-agnostic is a critical flaw that makes them ill-suited for the query expansion problem. Indeed this is one of the key limitations that led to the development of contextualized language models like BERT. BERT and similar models are trained on a masked language modeling objective, which means they learn to predict missing tokens in a piece of text based on the surrounding context. This makes them particularly well-suited for the query expansion problem, because they can take into account the context of the query when predicting related tokens. For example, if we input the query "heart attack treatment protocol" into a BERT model and ask it to predict related tokens, it might predict "myocardial infarction," "STEMI," and "acute coronary syndrome" as the top predictions for the masked token "heart attack". This is because the BERT model has learned from its training data that these tokens often appear in similar contexts and are semantically related.

<!-- Insert component that takes a query, masks out tokens, and uses a BERT model to predict the top-k most likely tokens for each masked token -->

## From BERT token predictions to SPLADE sparse vectors
SPLADE takes this idea of leveraging BERT's contextual token predictions and applies it in a very specific way to create sparse vector representations of queries and documents. Instead of just taking the top-k predicted tokens for each masked token in the query, SPLADE actually uses the full distribution of predicted tokens and their associated probabilities to create a sparse vector representation. Each dimension in the sparse vector corresponds to a token in the vocabulary, and the value in that dimension is the probability that the BERT model assigns to that token being relevant to the query. This allows SPLADE to create a much richer and more nuanced representation of the query that takes into account the full range of related tokens and their relevance, rather than just a binary indicator of whether a token is present or not. This is what gives SPLADE its power in solving the vocabulary mismatch problem and performing effective query expansion.

## Conclusion
In summary, SPLADE works because it leverages the contextual token prediction capabilities of BERT models to perform query expansion in a way that is much more effective than traditional methods. By treating the query as a token prediction problem and using the full distribution of predicted tokens to create sparse vector representations, SPLADE is able to capture the nuanced relationships between tokens and create much richer representations of queries and documents. This allows it to solve the vocabulary mismatch problem and retrieve relevant documents even when there is little to no lexical overlap between the query and the documents.