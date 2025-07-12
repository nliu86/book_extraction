# Comprehensive Test Results with Content Extraction

**Test Date:** 2025-07-12T15:17:21.098Z
**Pipeline Version:** Enhanced with Evaluation Loop and Content Extraction

## Executive Summary

- **Overall Success Rate:** 100.0% (10/10)
- **Book Detection Accuracy:** 100.0%
- **Book Extraction Success:** 100.0%
- **Classification Accuracy:** 100.0%
- **Average Processing Time:** 42.977199999999996s per image

## Validation Loop Performance

- **Total Volumes Checked:** 0
- **Average Volumes per Book:** 0.0
- **Validation Pass Rate:** N/A
- **Average Confidence Score:** 0.00

## Detailed Results

### Book Detection (Non-Book Images)

| Image | Status | Time (s) |
|-------|--------|----------|
| Abstract Art | ✅ Rejected | 1.7 |
| Landscape | ✅ Rejected | 1.8 |
| Movie Poster | ✅ Rejected | 1.9 |
| Nature | ✅ Rejected | 1.7 |
| Product | ✅ Rejected | 1.6 |

### Book Extraction with Content

| Book | Title Detected | Type | Correct | Content Length | Validation Attempts | Time (s) | Status |
|------|----------------|------|---------|----------------|-------------------|----------|--------|
| The Great Gatsby | The Great Gatsby | fiction | ✅ | 1237 | 1 | 58.1 | ✅ |
| Harry Potter | Harry Potter and the Chamber of Secrets | fiction | ✅ | 954 | 1 | 57.1 | ✅ |
| Pride and Prejudice | PRIDE AND PREJUDICE | fiction | ✅ | 2082 | 1 | 194.1 | ✅ |
| Educated | Educated | non-fiction | ✅ | 610 | 1 | 53.3 | ✅ |
| Sapiens | Sapiens: A Brief History of Humankind | non-fiction | ✅ | 1889 | 1 | 58.4 | ✅ |

### Extracted Content Samples

#### The Great Gatsby

- **Title:** The Great Gatsby
- **Author:** F. Scott Fitzgerald
- **Type:** fiction
- **Page Extracted:** 5
- **Content Preview:**

> 2                                               F. Scott Fitzgerald

intimate revelations of young men, or at least the terms in
which they express them, are usually plagiaristic and marred
by obvious...

*Full content saved to: debug/extracted-content/the-great-gatsby-content.txt*

#### Harry Potter

- **Title:** Harry Potter and the Chamber of Secrets
- **Author:** J.K. ROWLING
- **Type:** fiction
- **Page Extracted:** 9
- **Content Preview:**

> owl’s let out.”
    He exchanged dark looks with his wife, Petunia.
    Harry tried to argue back but his words were drowned by a
long, loud belch from the Dursleys’ son, Dudley.
    “I want more baco...

*Full content saved to: debug/extracted-content/harry-potter-content.txt*

#### Pride and Prejudice

- **Title:** PRIDE AND PREJUDICE
- **Author:** JANE AUSTEN
- **Type:** fiction
- **Page Extracted:** 6
- **Content Preview:**

> Of course, it can be of no consequence to *you*,
Mr. Bennet, to know whether your neighbour is settled
here or not."

"You are mistaken, my dear. I have a great regard
for you and your nerves, and I b...

*Full content saved to: debug/extracted-content/pride-and-prejudice-content.txt*

#### Educated

- **Title:** Educated
- **Author:** Tara Westover
- **Type:** non-fiction
- **Page Extracted:** 6
- **Content Preview:**

> Prologue
——-
I’M standing on the red railway car that sits abandoned next to the barn. The wind soars, whipping my hair across my face and pushing a chill down the open neck of my shirt. The gales are...

*Full content saved to: debug/extracted-content/educated-content.txt*

#### Sapiens

- **Title:** Sapiens: A Brief History of Humankind
- **Author:** Yuval Noah Harari
- **Type:** non-fiction
- **Page Extracted:** 7
- **Content Preview:**

> SAPIENS

A Brief History of Humankind

INTRODUCTION

ABOUT 13.5 BILLION years ago, matter, energy, time and space came into being in what is known as the Big Bang. The story of these fundamental featu...

*Full content saved to: debug/extracted-content/sapiens-content.txt*

### Performance Metrics

- **Total Processing Time:** 429.8s
- **Average Time per Image:** 43.0s

### Classification Breakdown

- **Fiction Books Detected:** 3
- **Non-Fiction Books Detected:** 2
- **Correctly Classified:** 5/5

## Key Findings

## Conclusion

The enhanced pipeline with evaluation loop shows 100.0% overall success rate. Book detection is 100.0% accurate at rejecting non-book images. For actual books, the extraction success rate is 100.0% with 100.0% classification accuracy. The validation loop averaged 0.0 volume attempts per book with a N/A pass rate.

All extracted content has been saved to individual text files in the debug/extracted-content/ directory for manual verification.
