---
title: 2025 SCPC 2-4
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```cpp
#include <bits/stdc++.h>
#define fIO ios_base::sync_with_stdio(false); cin.tie(NULL);
using namespace std;

int main()
{
    fIO

    int T;
    cin >> T;

    for (int testcase = 1; testcase <= T; testcase++)
    {
        int N, L;
        cin >> N >> L;
        vector<int> bomb(N);
        for (int i = 0; i < N; i++)
            cin >> bomb[i];

        
        long long mdistance0 = 0, mdistanceL = 0;
        int prev0 = 0, prevL = 0;

        for (int i = 0; i < N; i++) 
        {
            int b = bomb[i];
            long long totaldistance0 = min(mdistance0 + abs(prev0 - b) + abs(b - 0),
                                mdistanceL + abs(prevL - b) + abs(b - 0));
            long long totaldistanceL = min(mdistance0 + abs(prev0 - b) + abs(b - L),
                                mdistanceL + abs(prevL - b) + abs(b - L));

            mdistance0 = totaldistance0;
            mdistanceL = totaldistanceL;
            prev0 = 0;
            prevL = L;
        }

        cout << "Case #" << testcase << endl;
        cout << min(mdistance0, mdistanceL) << endl;
    }

    return 0;
}
```
