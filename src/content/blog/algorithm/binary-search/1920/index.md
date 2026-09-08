---
title: Binary Search 1920
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```cpp
#include <bits/stdc++.h>

using namespace std;

int binarySearch(const vector<int>& numbers, int target)
    {
        int start = 0;
        int end = numbers.size() - 1;

        while (start <= end)
        {
            int middle = (start + end) / 2;

            if(numbers[middle] == target)
            {
                return middle;
            }
            else if (numbers[middle] < target)
            {
                start = middle + 1;
            }
            else
            {
                end = middle - 1;
            }
            
        }
        return -1;
    }

int main()
{
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    cin >> n;

    vector<int> a(n);                 //n개의 정수 입력받기
    for(int i = 0; i < n; i++)
    {
        cin >> a[i];
    }

    sort(a.begin(), a.end());  //처음부터 끝까지 정렬

    int m;
    cin >> m;                    
    
    for(int i = 0; i < m; i++)   //m개의 찾고싶은 수를 x에 저장
    {
        int x;
        cin >> x;
    

    if(binarySearch(a, x) != -1)  //0이 false로 평가되어 -1이 아닐때로 명확히 비교
        cout << "1\n";
    else
        cout << "0\n";
    }

}
```
