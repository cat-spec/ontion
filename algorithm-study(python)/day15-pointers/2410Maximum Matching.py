def matchPlayersAndTrainers(players: list[int], trainers: list[int]) -> int:
    players.sort()
    trainers.sort()
    first=second=res=0
    while first<len(players) and second<len(trainers):
        if players[first]<trainers[second]:
            first+=1
            second+=1
            res+=1
        else:
            second+=1
    return res

print(matchPlayersAndTrainers([4,7,9],[8,2,5,8]))