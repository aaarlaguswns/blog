---
title: 2025 SCPC 3-1
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```cpp
#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

string N;
unordered_map<string, long long> memo;

// key 생성 함수
string make_key(int pos, bool tight, bool leading_zero) {
    return to_string(pos) + "_" + to_string(tight) + "_" + to_string(leading_zero);
}

long long dfs(int pos, bool tight, bool leading_zero) {
    if (pos == N.size()) return leading_zero ? 0 : 1;

    string key = make_key(pos, tight, leading_zero);
    if (memo.count(key)) return memo[key];

    char limit = tight ? N[pos] : '2';
    long long res = 0;

    for (char d : {'0', '1', '2'}) {
        if (tight && d > limit) continue;
        if (leading_zero && d == '0' && pos == 0) continue;

        bool next_tight = tight && (d == limit);
        bool next_leading_zero = leading_zero && (d == '0');

        res += dfs(pos + 1, next_tight, next_leading_zero);
    }

    return memo[key] = res;
}

long long count_valid(const string& num) {
    N = num;
    memo.clear();
    return dfs(0, true, true);
}
```
