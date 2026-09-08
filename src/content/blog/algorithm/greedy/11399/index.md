---
title: Greedy 11399
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
---

```cpp
#include <bits/stdc++.h>
using namespace std;

int main()
{
    int sum = 0;
    int n;
    cin >> n;
    vector<int> p(n);

    for(int i = 0; i < n; i++)
    {
        cin >> p[i];
    }

    sort(p.begin(), p.end());

    for(int i = 0; i < n; i++)
    {
        sum += p[i] * (n-i);
    }

    cout << sum;
}
```
