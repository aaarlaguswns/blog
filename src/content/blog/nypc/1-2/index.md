---
title: NYPC 1-2
description: Python 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```py
from enum import Enum
from dataclasses import dataclass
from typing import List, Optional, Tuple
from collections import Counter
from itertools import combinations
import sys
import random

class DiceRule(Enum):
    ONE = 0; TWO = 1; THREE = 2; FOUR = 3; FIVE = 4; SIX = 5
    CHOICE = 6; FOUR_OF_A_KIND = 7; FULL_HOUSE = 8; SMALL_STRAIGHT = 9; LARGE_STRAIGHT = 10; YACHT = 11

@dataclass
class Bid:
    group: str; amount: int

@dataclass
class DicePut:
    rule: DiceRule; dice: List[int]

class Game:
    def __init__(self):
        self.my_state = GameState(); self.opp_state = GameState()
        self.round = 0
        self.opp_bid_history: List[int] = []

    def calculate_bid(self, dice_a: List[int], dice_b: List[int]) -> Bid:
        self.round += 1
        
        value_a = self.my_state.evaluate_dice_group_value(dice_a, self.round)
        value_b = self.my_state.evaluate_dice_group_value(dice_b, self.round)

        chosen_group = "A" if value_a > value_b else "B"
        
        amount = 100
        if self.opp_bid_history:
            avg_bids = sum(self.opp_bid_history) / len(self.opp_bid_history)
            
            if self.round <= 5:
                amount = int(avg_bids * 0.7) 
            elif self.round <= 9:
                amount = int(avg_bids * 0.75 + 200)
            else:
                amount = int(avg_bids * 0.8 + 400)
        
        value_diff = abs(value_a - value_b)
        amount += int(value_diff / 25)

        return Bid(chosen_group, min(49999, max(0, amount)))

    def calculate_put(self) -> DicePut:
        _, best_rule, best_dice_put = self.my_state.calculate_best_put(self.round, [])
        return DicePut(best_rule, best_dice_put)
    
    def update_get(self, dice_a: List[int], dice_b: List[int], my_bid: Bid, opp_bid: Bid, my_group: str):
        self.opp_bid_history.append(opp_bid.amount)
        if my_group == "A": self.my_state.add_dice(dice_a); self.opp_state.add_dice(dice_b)
        else: self.my_state.add_dice(dice_b); self.opp_state.add_dice(dice_a)
        my_bid_ok = my_bid.group == my_group
        self.my_state.bid(my_bid_ok, my_bid.amount)
        opp_group = "B" if my_group == "A" else "A"; opp_bid_ok = opp_bid.group == opp_group
        self.opp_state.bid(opp_bid_ok, opp_bid.amount)

    def update_put(self, put: DicePut): self.my_state.use_dice(put)
    def update_set(self, put: DicePut): self.opp_state.use_dice(put)

class GameState:
    def __init__(self):
        self.dice = []; self.rule_score: List[Optional[int]] = [None] * 12; self.bid_score = 0

    def get_total_score(self) -> int:
        basic = sum(s for s in self.rule_score[0:6] if s is not None)
        bonus = 35000 if basic >= 63000 else 0
        combination = sum(s for s in self.rule_score[6:12] if s is not None)
        return basic + bonus + combination + self.bid_score
        
    def bid(self, is_successful: bool, amount: int): self.bid_score += -amount if is_successful else amount
    def add_dice(self, new_dice: List[int]): self.dice.extend(new_dice)

    def use_dice(self, put: DicePut):
        if put.rule is None or self.rule_score[put.rule.value] is not None:
            fallback_rule_val = next((i for i, s in enumerate(self.rule_score) if s is None), 6)
            put.rule = DiceRule(fallback_rule_val)
        
        dice_counts = Counter(self.dice)
        for d in put.dice:
            if dice_counts[d] > 0:
                self.dice.remove(d)
                dice_counts[d] -= 1
        
        self.rule_score[put.rule.value] = self.calculate_score(put)

    def evaluate_dice_group_value(self, dice_group: List[int], round_num: int) -> float:
        if not dice_group: return 0

        potential_score, _, _ = self.calculate_best_put(round_num, dice_group)
        synergy_bonus = 0
        group_counts = Counter(dice_group)
        my_dice_counts = Counter(self.dice)
        for num, count in group_counts.items():
            synergy_bonus += (count ** 2) * 500 
            if self.rule_score[num-1] is None:
                 synergy_bonus += my_dice_counts[num] * count * 800
        diversity_bonus = len(set(dice_group)) * 1000
        return potential_score + synergy_bonus + diversity_bonus

    def calculate_best_put(self, round_num: int, new_dice: List[int]) -> Tuple[int, DiceRule, List[int]]:
        current_dice = sorted(self.dice + new_dice)
        if len(current_dice) < 5:
            dice_put = current_dice + [1] * (5 - len(current_dice))
            rule_val = next((i for i, s in enumerate(self.rule_score) if s is None), 6)
            return -1, DiceRule(rule_val), dice_put

        potential_plays = []
        for rule in DiceRule:
            if self.rule_score[rule.value] is None:
                combo = self._get_best_dice_for_rule(current_dice, rule, round_num)
                if combo:
                    score = self.calculate_score(DicePut(rule, combo))
                    potential_plays.append((score, rule, combo))

        def get_strategic_value(play):
            score, rule, combo = play
            value = float(score)
            
            if rule.value <= 5:
                num_of_dice = combo.count(rule.value + 1)
                if num_of_dice >= 4: value += 40000
                elif num_of_dice == 3: value += 15000
            
            # [핵심 수정] CHOICE에 전략적 페널티를 부여하여 다른 족보와 점수가 같을 때 후순위로 밀리게 함
            if rule == DiceRule.CHOICE: value -= 1.0

            if rule == DiceRule.YACHT and score > 0: value += 100000
            if rule == DiceRule.LARGE_STRAIGHT and score > 0: value += 35000
            if round_num > 8 and rule.value > 5: value += 15000
            if score == 0: value = -99999
            return value

        if potential_plays:
            potential_plays.sort(key=get_strategic_value, reverse=True)
            best_score, best_rule, best_combo = potential_plays[0]
            
            if get_strategic_value(potential_plays[0]) < 10000 and round_num < 11:
                if self.rule_score[DiceRule.CHOICE.value] is None:
                    trash_combo = sorted(current_dice)[:5]
                    return self.calculate_score(DicePut(DiceRule.CHOICE, trash_combo)), DiceRule.CHOICE, trash_combo
                elif self.rule_score[DiceRule.ONE.value] is None:
                    trash_combo = self._get_best_dice_for_rule(current_dice, DiceRule.ONE, round_num)
                    if trash_combo:
                        return self.calculate_score(DicePut(DiceRule.ONE, trash_combo)), DiceRule.ONE, trash_combo

            return best_score, best_rule, best_combo

        final_rule_val = next((i for i, s in enumerate(self.rule_score) if s is None), 6)
        return 0, DiceRule(final_rule_val), current_dice[:5]

    def _get_best_dice_for_rule(self, current_dice: List[int], rule: DiceRule, round_num: int) -> List[int]:
        if len(current_dice) < 5: return []
        best_combo, max_score = [], -1

        for combo_tuple in combinations(current_dice, 5):
            combo = list(combo_tuple)
            score = self.calculate_score(DicePut(rule, combo))
            if score > max_score:
                max_score, best_combo = score, combo
        
        if rule in [DiceRule.FIVE, DiceRule.SIX] and max_score > 0:
            if best_combo.count(rule.value + 1) < 4 and round_num < 9: return [] 
        if rule in [DiceRule.THREE, DiceRule.FOUR] and max_score > 0:
            if best_combo.count(rule.value + 1) < 3: return []
        
        return best_combo

    @staticmethod
    def calculate_score(put: DicePut) -> int:
        rule, dice = put.rule, sorted(put.dice); counts = Counter(dice)
        score = sum(dice) * 1000
        if rule.value <= 5: return dice.count(rule.value + 1) * (rule.value + 1) * 1000
        if rule == DiceRule.CHOICE: return score
        if rule == DiceRule.FOUR_OF_A_KIND and any(c >= 4 for c in counts.values()): return score
        if rule == DiceRule.FULL_HOUSE and sorted(counts.values()) in [[2, 3], [5]]: return score
        if rule == DiceRule.SMALL_STRAIGHT:
            s = "".join(map(str, sorted(list(set(dice)))));
            if "1234" in s or "2345" in s or "3456" in s: return 15000
        if rule == DiceRule.LARGE_STRAIGHT:
            s = "".join(map(str, sorted(list(set(dice)))))
            if s in ["12345", "23456"]: return 30000
        if rule == DiceRule.YACHT and 5 in counts.values(): return 50000
        return 0

def main():
    game = Game(); dice_a, dice_b = [0] * 5, [0] * 5; my_bid = Bid("", 0)
    while True:
        try:
            line = input().strip();
            if not line: continue
            command, *args = line.split()
            if command == "READY": print("OK")
            elif command == "ROLL":
                str_a, str_b = args
                for i, c in enumerate(str_a): dice_a[i] = int(c)
                for i, c in enumerate(str_b): dice_b[i] = int(c)
                my_bid = game.calculate_bid(dice_a, dice_b)
                print(f"BID {my_bid.group} {my_bid.amount}")
            elif command == "GET":
                get_group, opp_group, opp_score = args
                game.update_get(dice_a, dice_b, my_bid, Bid(opp_group, int(opp_score)), get_group)
            elif command == "SCORE":
                put = game.calculate_put()
                game.update_put(put)
                print(f"PUT {put.rule.name} {''.join(map(str, sorted(put.dice)))}")
            elif command == "SET":
                rule, str_dice = args
                dice = [int(c) for c in str_dice]
                game.update_set(DicePut(DiceRule[rule], dice))
            elif command == "FINISH": break
        except EOFError: break

if __name__ == "__main__":
    main()
```
