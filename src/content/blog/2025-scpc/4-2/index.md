---
title: 2025 SCPC 4-2
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
tags:
  - C++
source: obsidian
---

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

ll total_distance(const vector<int>& A, const vector<int>& B) 
{
    ll sum = 0;
    for (size_t i = 0; i < A.size(); ++i)
        sum += abs((ll)A[i] - B[i]);
    return sum;
}

int main() 
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int T;
    cin >> T;

    for (int tc = 1; tc <= T; ++tc) 
    {
        int N, R;
        cin >> N >> R;

        vector<int> blue_houses(N - R), red_houses(R);
        vector<int> blue_stores(N - R - 1), red_stores(R + 1);

        for (int& x : blue_houses) cin >> x;
        for (int& x : red_houses) cin >> x;
        for (int& x : blue_stores) cin >> x;
        for (int& x : red_stores) cin >> x;

        sort(blue_houses.begin(), blue_houses.end());
        sort(red_houses.begin(), red_houses.end());
        sort(blue_stores.begin(), blue_stores.end());
        sort(red_stores.begin(), red_stores.end());

        // 미리 blue_houses와 blue_stores를 정렬했으니,
        // red_stores 중 하나씩 넘겨주며 최소 비용 계산
        ll answer = LLONG_MAX;

        for (int i = 0; i < red_stores.size(); ++i) 
        {
            // 빨간 상점 i번을 파란 집에게 넘긴다
            vector<int> blue_s = blue_stores;
            blue_s.push_back(red_stores[i]);

            // 빨간 상점 중 i번 빼고 나머지를 red_s에 저장
            vector<int> red_s;
            red_s.reserve(R);
            for (int j = 0; j < red_stores.size(); ++j) 
            {
                if (j != i) red_s.push_back(red_stores[j]);
            }

            // 빨간 집 <--> 빨간 상점, 파란 집 <--> 나머지
            ll red_cost = total_distance(red_houses, red_s);
            sort(blue_s.begin(), blue_s.end());  // 이 한 줄만 실행
            ll blue_cost = total_distance(blue_houses, blue_s);

            answer = min(answer, red_cost + blue_cost);
        }

        cout << "Case #" << tc << endl << answer << endl;
    }

    return 0;
}
```
