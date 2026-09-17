def maximumPopulation(logs: list[list[int]]) -> int:
    maxres=0
    yearindex=0
    for i in range(0, len(logs)):
        count=1
        year=0
        for k in range(i+1, len(logs)):
            if logs[i][1] > logs[k][0]:
                count+=1
                year=k
        if maxres<count:
            maxres=count
            yearindex=year
    return logs[yearindex][0]

print(maximumPopulation(logs = [[1950,1961],[1960,1971],[1970,1981]]))