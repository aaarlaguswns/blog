---
title: Binary Search 10816
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
---

```cpp
// 18870

//10816  lower bound and upper bound
#include <bits/stdc++.h>

using namespace std;
int main()
{
    int n, m;
    cin >> n;

    vector<int>a(n);
    for(int i = 0; i < n; i++)
    {
        cin >> a[i];
    }

    cin >> m;
    vector<int>b(m);
    for(int i = 0; i < m; i++)
    {
        cin >> b[i];
    }

    sort(a.begin(), a.end());
    

    vector<int> count(m);
    
   for(int i = 0; i < m; i++)
   {
        int lower = lower_bound(a.begin(), a.end(), b[i]) - a.begin();
        int upper = upper_bound(a.begin(), a.end(), b[i]) - a.begin();
        count[i] = upper - lower;
        
    }
    
    for(int i = 0; i < m; i++)
    {
        cout << count[i] << " ";
    }
    
    
    return 0; 
   }
```
