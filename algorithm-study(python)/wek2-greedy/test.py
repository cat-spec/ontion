class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    def __repr__(self) -> str:
        return f"{self.name} is {self.age} years old"

person = Person("", 1)
print(person)