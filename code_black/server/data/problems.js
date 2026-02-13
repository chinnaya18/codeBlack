/**
 * Problem Pool - Multiple problems per round, randomly assigned to competitors.
 * Each round has an array of problems. Each competitor gets ONE random problem.
 */
const problems = {
  1: [
    {
      id: "r1p1",
      title: "Sum of Array",
      description: `Given an array of N integers, find and print their sum.

Input Format:
- First line: N (number of elements)
- Second line: N space-separated integers

Output Format:
- A single integer: the sum of the array

Constraints:
- 1 <= N <= 1000
- -1000000 <= each element <= 1000000

Example:
Input:
3
1 2 3

Output:
6`,
      testCases: [
        { input: "3\n1 2 3", expected: "6" },
        { input: "5\n10 20 30 40 50", expected: "150" },
        { input: "1\n42", expected: "42" },
        { input: "4\n-1 -2 3 4", expected: "4" },
        { input: "3\n0 0 0", expected: "0" },
      ],
      sampleTestCase: { input: "3\n1 2 3", expected: "6" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r1p2",
      title: "Reverse a String",
      description: `Given a string S, print the reverse of the string.

Input Format:
- A single line containing the string S

Output Format:
- The reversed string

Constraints:
- 1 <= length of S <= 1000
- S contains only lowercase English letters

Example:
Input:
hello

Output:
olleh`,
      testCases: [
        { input: "hello", expected: "olleh" },
        { input: "world", expected: "dlrow" },
        { input: "a", expected: "a" },
        { input: "abcdef", expected: "fedcba" },
        { input: "racecar", expected: "racecar" },
      ],
      sampleTestCase: { input: "hello", expected: "olleh" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r1p3",
      title: "Find Maximum Element",
      description: `Given an array of N integers, find and print the maximum element.

Input Format:
- First line: N (number of elements)
- Second line: N space-separated integers

Output Format:
- A single integer: the maximum element

Constraints:
- 1 <= N <= 1000
- -1000000 <= each element <= 1000000

Example:
Input:
5
3 1 4 1 5

Output:
5`,
      testCases: [
        { input: "5\n3 1 4 1 5", expected: "5" },
        { input: "3\n-1 -5 -2", expected: "-1" },
        { input: "1\n42", expected: "42" },
        { input: "4\n100 200 300 400", expected: "400" },
        { input: "6\n7 7 7 7 7 7", expected: "7" },
      ],
      sampleTestCase: { input: "5\n3 1 4 1 5", expected: "5" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r1p4",
      title: "Count Vowels",
      description: `Given a string S, count and print the number of vowels (a, e, i, o, u) in the string.

Input Format:
- A single line containing the string S (lowercase only)

Output Format:
- A single integer: the count of vowels

Constraints:
- 1 <= length of S <= 1000
- S contains only lowercase English letters

Example:
Input:
hello

Output:
2`,
      testCases: [
        { input: "hello", expected: "2" },
        { input: "aeiou", expected: "5" },
        { input: "bcdfg", expected: "0" },
        { input: "programming", expected: "3" },
        { input: "a", expected: "1" },
      ],
      sampleTestCase: { input: "hello", expected: "2" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r1p5",
      title: "Even or Odd Count",
      description: `Given an array of N integers, count how many are even and how many are odd. Print two space-separated integers: even_count and odd_count.

Input Format:
- First line: N (number of elements)
- Second line: N space-separated integers

Output Format:
- Two space-separated integers: even_count odd_count

Constraints:
- 1 <= N <= 1000
- -1000000 <= each element <= 1000000

Example:
Input:
5
1 2 3 4 5

Output:
2 3`,
      testCases: [
        { input: "5\n1 2 3 4 5", expected: "2 3" },
        { input: "4\n2 4 6 8", expected: "4 0" },
        { input: "3\n1 3 5", expected: "0 3" },
        { input: "1\n0", expected: "1 0" },
        { input: "6\n-1 -2 3 4 -5 6", expected: "3 3" },
      ],
      sampleTestCase: { input: "5\n1 2 3 4 5", expected: "2 3" },
      points: 100,
      timeLimit: 5000,
    },
  ],
  2: [
    {
      id: "r2p1",
      title: "FizzBuzz",
      description: `Given an integer N, print numbers from 1 to N with the following rules:
- For multiples of 3, print "Fizz" instead of the number
- For multiples of 5, print "Buzz" instead of the number
- For multiples of both 3 and 5, print "FizzBuzz"

Input Format:
- A single integer N

Output Format:
- N lines, each containing either the number, "Fizz", "Buzz", or "FizzBuzz"

Constraints:
- 1 <= N <= 100

Example:
Input:
5

Output:
1
2
Fizz
4
Buzz`,
      testCases: [
        { input: "5", expected: "1\n2\nFizz\n4\nBuzz" },
        { input: "3", expected: "1\n2\nFizz" },
        {
          input: "15",
          expected:
            "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
        },
        { input: "1", expected: "1" },
        { input: "6", expected: "1\n2\nFizz\n4\nBuzz\nFizz" },
      ],
      sampleTestCase: { input: "5", expected: "1\n2\nFizz\n4\nBuzz" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r2p2",
      title: "Palindrome Check",
      description: `Given a string S, determine if it is a palindrome (reads the same forwards and backwards).
Print "YES" if it is a palindrome, "NO" otherwise.

Input Format:
- A single line containing the string S (lowercase only)

Output Format:
- "YES" or "NO"

Constraints:
- 1 <= length of S <= 1000

Example:
Input:
racecar

Output:
YES`,
      testCases: [
        { input: "racecar", expected: "YES" },
        { input: "hello", expected: "NO" },
        { input: "a", expected: "YES" },
        { input: "abba", expected: "YES" },
        { input: "abcd", expected: "NO" },
      ],
      sampleTestCase: { input: "racecar", expected: "YES" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r2p3",
      title: "Prime Number Check",
      description: `Given an integer N, determine if it is a prime number.
Print "PRIME" if N is prime, "NOT PRIME" otherwise.

Input Format:
- A single integer N

Output Format:
- "PRIME" or "NOT PRIME"

Constraints:
- 1 <= N <= 1000000

Example:
Input:
7

Output:
PRIME`,
      testCases: [
        { input: "7", expected: "PRIME" },
        { input: "4", expected: "NOT PRIME" },
        { input: "1", expected: "NOT PRIME" },
        { input: "2", expected: "PRIME" },
        { input: "97", expected: "PRIME" },
      ],
      sampleTestCase: { input: "7", expected: "PRIME" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r2p4",
      title: "Factorial Calculation",
      description: `Given a non-negative integer N, calculate and print N! (N factorial).

Input Format:
- A single integer N

Output Format:
- A single integer: N!

Constraints:
- 0 <= N <= 20

Example:
Input:
5

Output:
120`,
      testCases: [
        { input: "5", expected: "120" },
        { input: "0", expected: "1" },
        { input: "1", expected: "1" },
        { input: "10", expected: "3628800" },
        { input: "3", expected: "6" },
      ],
      sampleTestCase: { input: "5", expected: "120" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r2p5",
      title: "Sort and Print Array",
      description: `Given an array of N integers, sort them in ascending order and print the sorted array.

Input Format:
- First line: N (number of elements)
- Second line: N space-separated integers

Output Format:
- N space-separated integers in ascending order

Constraints:
- 1 <= N <= 1000
- -1000000 <= each element <= 1000000

Example:
Input:
5
5 3 1 4 2

Output:
1 2 3 4 5`,
      testCases: [
        { input: "5\n5 3 1 4 2", expected: "1 2 3 4 5" },
        { input: "3\n3 2 1", expected: "1 2 3" },
        { input: "1\n42", expected: "42" },
        { input: "4\n-3 5 -1 2", expected: "-3 -1 2 5" },
        { input: "5\n1 1 1 1 1", expected: "1 1 1 1 1" },
      ],
      sampleTestCase: { input: "5\n5 3 1 4 2", expected: "1 2 3 4 5" },
      points: 100,
      timeLimit: 5000,
    },
  ],
};

module.exports = problems;
