---
title: Binary Search 2343
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```cpp
//2343 - 기타 레슨
//파라메트릭 서치 - 최소용량
//

#include <bits/stdc++.h>
using namespace std;

int n, m;    //n: 강의의 수, m: 블루레이의 갯수

bool is_possible()

int main()
{
    cin >> n >> m;
    vector<int> a(n);

    for(int i = 0; i < n; i++)
    {
        cin >> a[i];
    }

    int left = 0, right = *max_element(tree.begin(), tree.end());
    int answer = 0;

    while(left <= right)
    {
        int mid = (left + right) / 2;
        if(is_possible(mid))
        {
            answer = mid;
            left = mid + 1;
        }
        else
        {
            right = mid - 1;
        }
    }

    cout << answer << "\n";
    
}
```
