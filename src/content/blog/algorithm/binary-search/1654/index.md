---
title: Binary Search 1654
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
---

```cpp
//만들 수 있는 랜선의 최대길이
#include <bits/stdc++.h>
#define fIO ios_base::sync_with_stdio(false); \
cin.tie(NULL);

using namespace std;
int main()
{
    fIO
    int K, N;
    cin >> K >> N;

    vector<int> lan(K);
    int max_len = 0;
    for(int i = 0; i < K; i++)
    {
        cin >> lan[i];
        max_len = max(max_len, lan[i]);
    }

    long long left = 1;
    long long right = max_len;
    long long mid = (left + right) / 2;

    while(left <= right)
    {
        int count = 0;
        for(int i = 0; i < K; i++)
        {
            count += lan[i] / mid;
        }

        if(count >= N)
        {
            left = mid + 1;
        }
        else
        {
            right = mid - 1;
        }
        mid = (left + right) / 2;
    }

    cout << mid << endl;

    return 0;
}
```
