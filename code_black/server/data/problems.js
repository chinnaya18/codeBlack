/**
 * Problem Pool
 * Each round contains multiple problems.
 * One random problem is assigned to each participant.
 */

const problems = {
  1: [
    {
      id: "r1p1",
      title: "Sum of Array",
      difficulty: "Easy",
      description: `
Problem Description:
You are given an array of integers. Your task is to compute and return the sum of all elements in the array.

Input Format:
- Line 1: An integer N, the number of elements in the array.
- Line 2: N space-separated integers.

Output Format:
- A single integer representing the sum of the array.

Constraints:
- 1 ≤ N ≤ 1000
- -10^6 ≤ arr[i] ≤ 10^6

Example:
Input:
3
1 2 3

Output:
6

Explanation:
1 + 2 + 3 = 6

Edge Cases:
- Array contains a single element
- All elements are negative
- Large positive and negative values together

Note:
No need to type full code or handle input/output.
You can return only the required function.

Example format:
int sumArr(int arr[]) {
  // your code
}
`,
      points: 100,
      timeLimit: 2000,
    },

    {
      id: "r1p2",
      title: "Reverse a String",
      difficulty: "Easy",
      description: `
Problem Description:
You are given a string. Your task is to reverse the string and return it.

Input Format:
- A single line containing the string S.

Output Format:
- A single line containing the reversed string.

Constraints:
- 1 ≤ length of S ≤ 1000
- S contains only lowercase letters (a-z).

Example:
Input:
hello

Output:
olleh

Explanation:
Reversing the string "hello" gives "olleh".

Edge Cases:
- Single character string
- Palindrome string
- Even and odd length strings

Note:
No need to type full code or handle input/output.
You can return only the required function.

Example format:
string reverseString(string s) {
  // your code
}
`,
      points: 100,
      timeLimit: 2000,
    }
  ],

  2: [
    {
      id: "r2p1",
      title: "FizzBuzz",
      difficulty: "Easy",
      description: `
Problem Description:
Given an integer N, print numbers from 1 to N using the following rules:
- Print "Fizz" for multiples of 3
- Print "Buzz" for multiples of 5
- Print "FizzBuzz" for multiples of both 3 and 5
- Otherwise, print the number itself

Input Format:
- A single integer N.

Output Format:
- N lines following the rules above.

Constraints:
- 1 ≤ N ≤ 100

Example:
Input:
5

Output:
1
2
Fizz
4
Buzz

Explanation:
Multiples of 3 → Fizz  
Multiples of 5 → Buzz  
Multiples of both → FizzBuzz

Edge Cases:
- N = 1
- N divisible by both 3 and 5
- Maximum value of N

Note:
No need to type full code or handle input/output.
You can return only the required function.

Example format:
vector<string> fizzBuzz(int N) {
  // your code
}
`,
      points: 150,
      timeLimit: 2000,
    }
  ]
};

module.exports = problems;