---
title: 2025 SCPC 4-1
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
---

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

// 두 벡터의 총 거리 계산 함수
ll total_distance(const vector<int>& people, const vector<int>& stores) {
    ll sum = 0;
    for (size_t i = 0; i < people.size(); ++i) {
        sum += abs((ll)people[i] - stores[i]);
    }
    return sum;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int T; // 테스트 케이스 수
    cin >> T;

    for (int test_case = 1; test_case <= T; ++test_case) {
        int N, R;
        cin >> N >> R; // 집과 빨간 집의 수 (R == 1)

        int blue_house_count = N - R;
        int red_house_count = R;

        int blue_store_count = N - R - 1;
        int red_store_count = R + 1;

        vector<int> blue_houses(blue_house_count);
        vector<int> red_houses(red_house_count);

        vector<int> blue_stores(blue_store_count);
        vector<int> red_stores(red_store_count);

        // 파란 집 입력
        for (int i = 0; i < blue_house_count; ++i) {
            cin >> blue_houses[i];
        }

        // 빨간 집 입력
        for (int i = 0; i < red_house_count; ++i) {
            cin >> red_houses[i];
        }

        // 파란 상점 입력
        for (int i = 0; i < blue_store_count; ++i) {
            cin >> blue_stores[i];
        }

        // 빨간 상점 입력
        for (int i = 0; i < red_store_count; ++i) {
            cin >> red_stores[i];
        }

        ll answer = LLONG_MAX;

        for (int i = 0; i < 2; ++i) {
            // i번째 빨간 상점을 파란 집에 넘긴다
            vector<int> current_blue_stores = blue_stores;
            current_blue_stores.push_back(red_stores[i]);
            sort(current_blue_stores.begin(), current_blue_stores.end());

            // 남은 빨간 상점은 빨간 집과 매칭
            int red_store_for_red = red_stores[1 - i];
            int red_house = red_houses[0];
            ll red_cost = abs((ll)red_house - red_store_for_red);

            sort(blue_houses.begin(), blue_houses.end());
            ll blue_cost = total_distance(blue_houses, current_blue_stores);

            answer = min(answer, red_cost + blue_cost);
        }

        // 출력 형식 맞추기
        cout << "Case #" << test_case << endl;
        cout << answer << endl;
    }

    return 0;
}
```
