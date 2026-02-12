const problems = {
  1: {
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
    points: 100,
    timeLimit: 5000,
  },
  2: {
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
    points: 100,
    timeLimit: 5000,
  },
};

module.exports = problems;
