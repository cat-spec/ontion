def quickSort(arr,start,end):
    pi=realSort(arr,start,end)

    quickSort(arr,start,pi-1)
    quickSort(arr,pi+1,end)
def realSort(arr,start,end):
    temp = arr[end]
    for i in range(start,end):
        if arr[start]>temp:
            arr[end]
arr = [10, 7, 8, 9, 1, 5]
n = len(arr)
quickSort(arr,0,n-1)
print (f'排序后的数组:',arr)


