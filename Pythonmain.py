balance = 0.0
kyc_documents ={}
def check_balance():
   print(f"Your current balance is {balance}")



def deposit(amount):
    global balance
    if amount > 0:
        balance += amount
        return True
    else:
        print("Cannot deposit a negative amount.") 
        return False

def withdraw(amount):
    global balance
    if amount <= 0:
        print("Cannot withdraw a negative or zero amount.") 
    elif amount > balance:
        print("Cannot withdraw. Insufficient Balance.")
    else:
        balance -= amount

def update_kyc(docs):
    global kyc_documents
    kyc_documents.update(docs)


def check_kyc():
    if len(kyc_documents) ==0:
        print("KYC not done")
    else:
        for doc in kyc_documents:
            print(f"{doc}: {kyc_documents[doc]}")

update_kyc(kyc_documents)
print(kyc_documents)      
print("KYC updated!")

if __name__ == "__main__":
    print("Welcome to ABC bank!!!")

    while True:
        print("1. Check your balance")
        print("2. Deposit an amount")
        print("3. Withdraw an amount")
        print("4. Check KYC")
        print("5. Update KYC")
        print("6. Quit. ")
        choice= input("Enter your choice(1-6): ")


        if choice == '1':
            check_balance()
        elif choice == '2':
            amt = float(input("Enter the amount to deposit: "))
            deposit(amt)
            print(f"Amount {amt} deposited successfully")
        elif choice == '3':
            amt = float(input("Enter the amount to withdraw: "))
            withdraw(amt)
            print(f"Amount {amt} withdrawn successfully")
        elif choice == '4':
            check_kyc()
                
        elif choice == '5':
                kyc_docs = {}
                n_documents = int(input("Enter the number of documents you want to add: "))

                for i in range(n_documents):
                    key = input("Enter the document type: ")
                    value = input("Enter the document number: ")
                    kyc_docs[key]= value

                update_kyc(kyc_docs)
                print("KYC updated!")
        elif choice == '6':
            print("Quiting. Have a nice day.")
            break
        else: 
            print("Invalid choice!!! Re-try.")

    print("Thank you for banking with us!")

