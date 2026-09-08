---
title: 2025 SCPC 2-2
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```cpp
//greed algorithm
#include <bits/stdc++.h>
#define fIO ios_base::sync_with_stdio(false); \
cin.tie(NULL);

using namespace std;

int main()
{
    fIO

    int T;
    cin >> T;

    for(int testcase = 1; testcase <= T; testcase++) // 테스트 케이스 반복
    {
        int N, L;
        cin >> N >> L;

        vector<int> bomb(N);
        for (int i = 0; i < N; i++)
        {
            cin >> bomb[i];
        }

    

        int current = 0;          // 철수의 현재 위치
        long long sum = 0;        // 총 이동 거리

        for (int i = 0; i < N; i++)
        {
            sum += abs(current - bomb[i]); // 현재 위치 → 폭탄까지 이동

            
            if (abs(bomb[i]) <= abs(bomb[i] - L))   //0으로 갈지 L로 갈지 판단
            {
                sum += abs(bomb[i]); // 0으로 이동
                current = 0;
            }
            else
            {
                sum += abs(bomb[i] - L); // L으로 이동
                current = L;
            }
        }
        cout << "Case #" << testcase << endl;
        cout << sum << endl; // 각 테스트 케이스 결과 출력
    }

    return 0;
}
```
