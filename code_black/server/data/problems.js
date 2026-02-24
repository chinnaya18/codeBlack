/**
 * Problem Pool - Multiple problems per round.
 * Each competitor receives ONE random problem from the selected round.
 */

const problems = {
  1: [
    {
      id: "r1p1",
      title: "Round 1 - Problem 1: Sum of Array",
      difficulty: "Easy",
      tags: ["arrays", "math", "basics"],
      description: `
You are given an array of N integers.

Your task is to compute and print the sum of all elements in the array.

--------------------------------
Input Format:
--------------------------------
Line 1: Integer N (number of elements)
Line 2: N space-separated integers

--------------------------------
Output Format:
--------------------------------
Print a single integer — the sum of the array.

--------------------------------
Constraints:
--------------------------------
1 ≤ N ≤ 1000
-10^6 ≤ arr[i] ≤ 10^6

--------------------------------
Example 1:
--------------------------------
Input:
3
1 2 3

Output:
6

--------------------------------
Example 2:
--------------------------------
Input:
5
-1 -2 -3 -4 -5

Output:
-15

--------------------------------
Edge Case Example:
--------------------------------
Input:
1
999999

Output:
999999

--------------------------------
Explanation:
--------------------------------
In example 1:
1 + 2 + 3 = 6

In example 2:
Sum of negative numbers = -15
`,
      sampleTestCase: {
        input: "3\n1 2 3",
        expected: "6",
      },
      points: 100,
      timeLimit: 2000,
    },

    {
      id: "r1p2",
      title: "Round 1 - Problem 2: Reverse a String",
      difficulty: "Easy",
      tags: ["strings", "two-pointers"],
      description: `
You are given a string S containing only lowercase English letters.

Your task is to reverse the string and print it.

--------------------------------
Input Format:
--------------------------------
A single line containing the string S

--------------------------------
Output Format:
--------------------------------
Print the reversed string.

--------------------------------
Constraints:
--------------------------------
1 ≤ length of S ≤ 1000
S contains only lowercase letters (a-z)

--------------------------------
Example 1:
--------------------------------
Input:
hello

Output:
olleh

--------------------------------
Example 2:
--------------------------------
Input:
racecar

Output:
racecar

--------------------------------
Edge Case Example:
--------------------------------
Input:
a

Output:
a

--------------------------------
Explanation:
--------------------------------
Reversing means the first character becomes last,
second becomes second last, and so on.
`,
      sampleTestCase: {
        input: "hello",
        expected: "olleh",
      },
      points: 100,
      timeLimit: 2000,
    }
  ],

  2: [
    {
      id: "r2p1",
      title: "Round 2 - Problem 1: FizzBuzz",
      difficulty: "Easy",
      tags: ["loops", "conditionals"],
      description: `
Given a number N, print numbers from 1 to N.

Rules:
- If number divisible by 3 → print "Fizz"
- If number divisible by 5 → print "Buzz"
- If divisible by both 3 and 5 → print "FizzBuzz"
- Otherwise print the number

--------------------------------
Input Format:
--------------------------------
Single integer N

--------------------------------
Output Format:
--------------------------------
Print N lines.

--------------------------------
Constraints:
--------------------------------
1 ≤ N ≤ 100

--------------------------------
Example:
--------------------------------
Input:
5

Output:
1
2
Fizz
4
Buzz

--------------------------------
Example 2:
--------------------------------
Input:
15

Output:
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
`,
      sampleTestCase: {
        input: "5",
        expected: "1\n2\nFizz\n4\nBuzz",
      },
      points: 150,
      timeLimit: 2000,
    }
  ]
};

module.exports = problems;