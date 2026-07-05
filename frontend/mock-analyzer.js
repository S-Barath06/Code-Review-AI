const MOCK_TEMPLATES = {
  cpp: {
    title: "Bubble Sort (C++)",
    code: `// C++ Inefficient Bubble Sort
#include <iostream>
#include <vector>

void bubbleSort(std::vector<int> arr) { // Inefficient: copy by value!
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // Swap elements
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    std::vector<int> data = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(data);
    return 0;
}`
  },
  python: {
    title: "String Accumulation (Python)",
    code: `# Inefficient string accumulation in Python
def join_words(words_list):
    result = ""
    for word in words_list:
        result += word + " " # Inefficient: creates new string on every iteration (O(N^2))
    return result

# Example run
words = ["hello"] * 10000
print(len(join_words(words)))`
  },
  javascript: {
    title: "Recursive Fibonacci (JavaScript)",
    code: `// Inefficient Recursive Fibonacci without Memoization
function fibonacci(n) {
    if (n <= 1) {
        return n;
    }
    // Inefficient: O(2^N) exponential time complexity due to redundant operations
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(30));`
  },
  java: {
    title: "Inefficient Search and Iteration (Java)",
    code: `// Inefficient iteration and array lookup
import java.util.ArrayList;
import java.util.List;

public class SearchList {
    public static boolean containsValue(List<Integer> list, int target) {
        // Inefficient linear search instead of hashing for frequent queries
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i) == target) {
                return true;
            }
        }
        return false;
    }
}`
  }
};

const MOCK_EXERCISES = {
  java_input_sum: {
    title: "Java: Scanner Input Sum",
    language: "java",
    code: `// EXERCISE: Optimize reading and summing N integers from Scanner.
// Currently creates a new Scanner instance inside the loop, causing performance drops.
import java.util.Scanner;

public class InputSum {
    public static int sumNumbers(int n) {
        int total = 0;
        for (int i = 0; i < n; i++) {
            // Inefficient: Scanner initialized inside loop!
            Scanner scanner = new Scanner(System.in);
            if (scanner.hasNextInt()) {
                total += scanner.nextInt();
            }
        }
        return total;
    }
}`
  },
  java_linear_search: {
    title: "Java: Array Search",
    language: "java",
    code: `// EXERCISE: Optimize linear array search.
// Currently performs a sequential linear search which is O(N).
// Since the array is sorted, optimize it to run in O(log N) binary search.
public class ArraySearch {
    public static int findIndex(int[] sortedNums, int target) {
        // Inefficient for sorted arrays: O(N) search
        for (int i = 0; i < sortedNums.length; i++) {
            if (sortedNums[i] == target) {
                return i;
            }
        }
        return -1;
    }
}`
  },
  java_string_concat: {
    title: "Java: String Loop Concat",
    language: "java",
    code: `// EXERCISE: Optimize string accumulation inside a loop.
// Currently concatenates strings using += which creates a new String copy on each step (O(N^2) time).
public class StringBuild {
    public static String joinWords(String[] words) {
        String result = "";
        // Inefficient: String concatenation in loop
        for (int i = 0; i < words.length; i++) {
            result += words[i] + " ";
        }
        return result;
    }
}`
  },
  java_palindrome: {
    title: "Java: String Palindrome",
    language: "java",
    code: `// EXERCISE: Optimize palindrome checker.
// Currently creates a reversed string copy copy before checking equality (O(N) space and allocation).
public class Palindrome {
    public static boolean isPalindrome(String s) {
        String reversed = "";
        // Inefficient: Builds reverse string copy
        for (int i = s.length() - 1; i >= 0; i--) {
            reversed += s.charAt(i);
        }
        return s.equals(reversed);
    }
}`
  }
};


function getMockAnalysis(language, code) {
  // Analyze the code using simple checks and return structured feedback
  let score = 90;
  let timeOrig = "O(N)";
  let timeOpt = "O(N)";
  let spaceOrig = "O(1)";
  let spaceOpt = "O(1)";
  let bottlenecks = [];
  let optimized = code;
  let compilerAdvice = {};

  const codeLower = code.toLowerCase();

  if (language === 'cpp') {
    if (codeLower.includes('vector<int> arr') && !codeLower.includes('&')) {
      bottlenecks.push({
        issue: "Vector passed by value",
        impact: "High Memory & CPU overhead. The entire vector is copied on every function call.",
        fix: "Pass the vector by constant reference: `const std::vector<int>& arr` (or non-const if modifications are returned)."
      });
      score -= 25;
    }
    if (codeLower.includes('for') && codeLower.includes('for') && (codeLower.includes('bubble') || codeLower.includes('sort'))) {
      bottlenecks.push({
        issue: "Quadratic sorting algorithm (Bubble Sort)",
        impact: "Very poor time complexity O(N²). Unsuitable for larger datasets.",
        fix: "Replace with `std::sort` which uses Introsort (average/worst-case O(N log N))."
      });
      timeOrig = "O(N²)";
      timeOpt = "O(N log N)";
      score -= 35;
      optimized = `// Optimized sorting using standard library in C++
#include <iostream>
#include <vector>
#include <algorithm> // Required for std::sort

void sortData(std::vector<int>& arr) { // Optimized: passed by reference
    // std::sort is highly optimized, running in O(N log N) time
    std::sort(arr.begin(), arr.end());
}

int main() {
    std::vector<int> data = {64, 34, 25, 12, 22, 11, 90};
    sortData(data);
    return 0;
}`;
    } else {
      optimized = `// Optimized C++ Code (Mock suggestions applied)
` + code.replace(/std::vector<int>\s+arr/g, 'const std::vector<int>& arr');
    }

    compilerAdvice = {
      recommended: "GCC (g++) / Clang (clang++)",
      flags: "-O3 -march=native -std=c++17 -flto",
      online: "[Compiler Explorer (Godbolt)](https://godbolt.org/) (Recommended), [Ideone](https://ideone.com/)",
      details: "For high performance, compile with `-O3` to enable full compiler optimizations, `-march=native` to target your local CPU's vector registers (AVX/SSE), and `-flto` for Link Time Optimization (LTO)."
    };

  } else if (language === 'python') {
    if (codeLower.includes('+=') && (codeLower.includes('for') || codeLower.includes('while')) && (codeLower.includes('word') || codeLower.includes('str'))) {
      bottlenecks.push({
        issue: "Quadratic string concatenation",
        impact: "High memory overhead. Strings in Python are immutable, so `+=` creates a new copy of the string on every step, leading to O(N²) time complexity.",
        fix: "Collect parts in a list and join them at the end using `''.join(parts)` which is optimized in CPython (O(N) time)."
      });
      timeOrig = "O(N²)";
      timeOpt = "O(N)";
      score -= 35;
      optimized = `# Optimized Python string construction
def join_words(words_list):
    # O(N) optimized join operation
    return " ".join(words_list)

# Example run
words = ["hello"] * 10000
print(len(join_words(words)))`;
    } else if (codeLower.includes('def fib') || codeLower.includes('fibonacci')) {
      bottlenecks.push({
        issue: "Exponential recursion without memoization",
        impact: "Exponential time complexity O(2^N). Computes identical subproblems thousands of times recursively.",
        fix: "Apply the `@lru_cache` decorator from Python's standard `functools` module, or use dynamic programming (tabulation)."
      });
      timeOrig = "O(2^N)";
      timeOpt = "O(N)";
      spaceOrig = "O(N)";
      spaceOpt = "O(1)";
      score -= 45;
      optimized = `# Optimized Fibonacci using lru_cache memoization or iterative DP
from functools import lru_cache

@lru_cache(maxsize=None)
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Alternative iterative approach (even better: O(1) space):
def fibonacci_iterative(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

console_result = fibonacci_iterative(30)
print(console_result)`;
    } else if (codeLower.includes('def two_sum') || codeLower.includes('two_sum')) {
      bottlenecks.push({
        issue: "Quadratic search nested loops",
        impact: "Time complexity is O(N²) because it searches all index pairs. Slow for large input arrays.",
        fix: "Use a hash map (dictionary) to store visited numbers and resolve matches in a single pass."
      });
      timeOrig = "O(N²)";
      timeOpt = "O(N)";
      spaceOrig = "O(1)";
      spaceOpt = "O(N)";
      score = 40;
      optimized = `# Optimized Python Two Sum using a dictionary
def two_sum(nums, target):
    # Runs in O(N) time and O(N) space using a single pass dictionary lookup
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Example:
print(two_sum([2, 7, 11, 15], 9))`;
    }

    compilerAdvice = {
      recommended: "PyPy3 (for execution speed) or CPython (standard)",
      flags: "No flags needed. For PyPy, run: `pypy3 script.py`",
      online: "[Python.org Shell](https://www.python.org/shell/), [Replit](https://replit.com/)",
      details: "If you need heavy mathematical or algorithmic execution speed in Python, run your script with **PyPy3**. PyPy includes a Just-In-Time (JIT) compiler that can speed up execution by 5x to 100x compared to regular CPython."
    };

  } else if (language === 'javascript') {
    if ((codeLower.includes('fib') || codeLower.includes('fibonacci')) && codeLower.includes('return') && codeLower.includes('- 1')) {
      bottlenecks.push({
        issue: "Naive exponential recursion",
        impact: "Time complexity O(2^N). Causes browser tab crashes or call-stack overflow on larger inputs.",
        fix: "Implement a memoized solution using a Map or cache object, or use iterative tabulation to run in O(N) time."
      });
      timeOrig = "O(2^N)";
      timeOpt = "O(N)";
      spaceOrig = "O(N)";
      spaceOpt = "O(1)";
      score -= 50;
      optimized = `// Optimized Fibonacci using dynamic programming (Tabulation)
function fibonacci(n) {
    if (n <= 1) return n;
    
    let prev2 = 0;
    let prev1 = 1;
    let current = 0;
    
    // O(N) time, O(1) space optimization
    for (let i = 2; i <= n; i++) {
        current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }
    return current;
}

console.log(fibonacci(30));`;
    } else {
      bottlenecks.push({
        issue: "Potential non-strict mode script execution",
        impact: "Minor performance and safety issues under standard engines.",
        fix: "Prepend your file or function scope with `'use strict';` to enable engine optimization pathing."
      });
      score -= 10;
    }

    compilerAdvice = {
      recommended: "V8 Engine (Node.js / Chrome Runtime)",
      flags: "Node.js optimization flags: `--max-old-space-size=4096 --turbo`",
      online: "[JSFiddle](https://jsfiddle.net/), [StackBlitz](https://stackblitz.com/)",
      details: "JavaScript runs on JIT compilation engines like V8. For high memory executions, use Node.js flags to scale heap allocation."
    };

  } else {
    // Java Exercises analysis
    if (codeLower.includes('scanner') && codeLower.includes('new scanner') && (codeLower.includes('for') || codeLower.includes('while'))) {
      timeOrig = "O(N)";
      timeOpt = "O(N)";
      spaceOrig = "O(N)";
      spaceOpt = "O(1)";
      score = 50;
      optimized = `// Optimized Java Scanner Input Sum
import java.util.Scanner;

public class InputSum {
    public static int sumNumbers(int n) {
        int total = 0;
        // Optimized: Instantiate Scanner once outside the loop to avoid memory thrashing
        Scanner scanner = new Scanner(System.in);
        for (int i = 0; i < n; i++) {
            if (scanner.hasNextInt()) {
                total += scanner.nextInt();
            }
        }
        return total;
    }
}`;
    } else if (codeLower.includes('index') && codeLower.includes('sortednums')) {
      timeOrig = "O(N)";
      timeOpt = "O(log N)";
      spaceOrig = "O(1)";
      spaceOpt = "O(1)";
      score = 45;
      optimized = `// Optimized Binary Search for sorted arrays in Java
public class ArraySearch {
    public static int findIndex(int[] sortedNums, int target) {
        // Optimized: Binary Search splits space in half running in O(log N)
        int low = 0;
        int high = sortedNums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (sortedNums[mid] == target) {
                return mid;
            } else if (sortedNums[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }
}`;
    } else if (codeLower.includes('words') && codeLower.includes('+=') && (codeLower.includes('for') || codeLower.includes('while'))) {
      timeOrig = "O(N²)";
      timeOpt = "O(N)";
      spaceOrig = "O(N²)";
      spaceOpt = "O(N)";
      score = 35;
      optimized = `// Optimized string builder in Java
public class StringBuild {
    public static String joinWords(String[] words) {
        // Optimized: StringBuilder aggregates strings dynamically in O(N)
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            sb.append(words[i]).append(" ");
        }
        return sb.toString();
    }
}`;
    } else if (codeLower.includes('palindrome') || (codeLower.includes('reversed') && codeLower.includes('charat'))) {
      timeOrig = "O(N)";
      timeOpt = "O(N)";
      spaceOrig = "O(N)";
      spaceOpt = "O(1)";
      score = 40;
      optimized = `// Optimized two-pointer palindrome checker in Java
public class Palindrome {
    public static boolean isPalindrome(String s) {
        // Optimized: Double-pointer check in place avoids allocating string copies
        int left = 0;
        int right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}`;
    } else {
      timeOrig = "O(N)";
      timeOpt = "O(N)";
      score = 90;
      optimized = code;
    }
  }

  // Ensure score is within boundaries
  score = Math.max(10, Math.min(score, 100));

  const compInfoMap = {
    cpp: "GCC 11+ (C++17)",
    python: "CPython 3.10+ / PyPy3",
    javascript: "V8 / Node.js 18+",
    java: "OpenJDK 17+"
  };

  return {
    efficiencyScore: score,
    timeComplexityOriginal: timeOrig,
    timeComplexityOptimized: timeOpt,
    spaceComplexityOriginal: spaceOrig,
    spaceComplexityOptimized: spaceOpt,
    compilerInfo: compInfoMap[language] || "Standard Compiler",
    bottlenecks: bottlenecks.length > 0 ? bottlenecks : [{
      issue: "No critical bottlenecks found",
      impact: "Minimal optimization headroom.",
      fix: "Code is clean or not matching standard mock anti-patterns. Use Live AI mode for custom reviews."
    }],
    optimizedCode: optimized,
    compilerAdvice: compilerAdvice
  };
}

// Export for Node and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MOCK_TEMPLATES, MOCK_EXERCISES, getMockAnalysis };
}
if (typeof window !== 'undefined') {
  window.MOCK_TEMPLATES = MOCK_TEMPLATES;
  window.MOCK_EXERCISES = MOCK_EXERCISES;
  window.getMockAnalysis = getMockAnalysis;
}
