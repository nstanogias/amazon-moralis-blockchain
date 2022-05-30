import { createContext, useState, useEffect } from 'react'
import { useMoralis, useMoralisQuery } from 'react-moralis'
import { amazonAbi, amazonCoinAddress } from '../lib/constants'
import { ethers } from 'ethers'

export const AmazonContext = createContext()

export const AmazonProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [formattedAccount, setFormattedAccount] = useState('')
  const [balance, setBalance] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [amountDue, setAmountDue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [etherscanLink, setEtherscanLink] = useState('')
  const [nickname, setNickname] = useState('')
  const [username, setUsername] = useState('')
  const [assets, setAssets] = useState<any[]>([])

  const {
    authenticate,
    isAuthenticated,
    enableWeb3,
    Moralis,
    user,
    isWeb3Enabled,
  } = useMoralis()

  const {
    data: userData,
    error: userDataError,
    isLoading: userDataIsLoading,
  } = useMoralisQuery('_User')

  const {
    data: assetsData,
    error: assetsDataError,
    isLoading: assetsDataIsLoading,
  } = useMoralisQuery('assets')

  useEffect(() => {
    ;(async () => {
      console.log(assetsData)
      await enableWeb3()
      await getAssets()
    })()
  }, [userData, assetsData])

  useEffect(() => {
    if (!isWeb3Enabled) {
      ;(async () => {
        await enableWeb3()
      })()
    }
    // ;(async () => {
    //   await listenToUpdates()
    // })()

    if (isAuthenticated) {
      ;(async () => {
        await getBalance()
        const currentUsername = await user?.get('nickname')
        setUsername(currentUsername)
        const account = await user?.get('ethAddress')
        setCurrentAccount(account)
        const formatAccount = account.slice(0, 5) + '...' + account.slice(-5)
        setFormattedAccount(formatAccount)
      })()
    } else {
      setCurrentAccount('')
      setFormattedAccount('')
      setBalance('')
    }
  }, [
    isWeb3Enabled,
    isAuthenticated,
    balance,
    setBalance,
    authenticate,
    currentAccount,
    setUsername,
    user,
    username,
  ])

  const connectWallet = async () => {
    await enableWeb3()
    await authenticate()
  }

  const buyTokens = async () => {
    if (!isAuthenticated) {
      await connectWallet()
    }

    const amount = ethers.BigNumber.from(tokenAmount)
    const price = ethers.BigNumber.from('100000000000000')
    const calcPrice = amount.mul(price)

    console.log(amazonCoinAddress)

    let options = {
      contractAddress: amazonCoinAddress!,
      functionName: 'mint',
      abi: amazonAbi,
      msgValue: calcPrice,
      params: {
        amount,
      },
    }
    const transaction = await Moralis.executeFunction(options)
    const receipt = await transaction.wait()
    setIsLoading(false)
    console.log(receipt)
    setEtherscanLink(
      `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`
    )
  }

  const handleSetUsername = () => {
    if (user) {
      if (nickname) {
        user.set('nickname', nickname)
        user.save()
        setNickname('')
      } else {
        console.log("Can't set empty nickname")
      }
    } else {
      console.log('No user')
    }
  }

  const getBalance = async () => {
    try {
      if (!isAuthenticated || !currentAccount) return
      const options = {
        contractAddress: amazonCoinAddress,
        functionName: 'balanceOf',
        abi: amazonAbi,
        params: {
          account: currentAccount,
        },
      }

      if (isWeb3Enabled) {
        const response = await Moralis.executeFunction(options)
        console.log(response.toString())
        setBalance(response.toString())
      }
    } catch (error) {
      console.log(error)
    }
  }

  const getAssets = async () => {
    try {
      await enableWeb3()
      setAssets(assetsData)
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <AmazonContext.Provider
      value={{
        formattedAccount,
        isAuthenticated,
        buyTokens,
        getBalance,
        balance,
        setTokenAmount,
        tokenAmount,
        amountDue,
        setAmountDue,
        isLoading,
        setIsLoading,
        setEtherscanLink,
        etherscanLink,
        currentAccount,
        nickname,
        setNickname,
        username,
        setUsername,
        handleSetUsername,
        assets,
      }}
    >
      {children}
    </AmazonContext.Provider>
  )
}
