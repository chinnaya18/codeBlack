/**
 * Problem Pool - Multiple problems per round, randomly assigned to competitors.
 * Each round has an array of problems. Each competitor gets ONE random problem.
 */
const problems = {
  1: [
    {
      id: "r1p1",
      title: "Question 1: Sum of Array",
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
      testCases: [],
      sampleTestCase: { input: "3\n1 2 3", expected: "6" },
      points: 100,
      timeLimit: 5000,
    },
    {
      id: "r1p2",
      title: "Question 2: Reverse a String",
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
      testCases: [],
      sampleTestCase: { input: "hello", expected: "olleh" },
      points: 100,
      timeLimit: 5000,
    }
  ],
  2: [
    {
      id: "r2p1",
      title: "Round 2: FizzBuzz",
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
      testCases: [],
      sampleTestCase: { input: "5", expected: "1\n2\nFizz\n4\nBuzz" },
      points: 100,
      timeLimit: 5000,
    }
  ],
};

module.exports = problems;
