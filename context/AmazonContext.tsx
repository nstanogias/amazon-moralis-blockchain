// @ts-nocheck
import { createContext, useState, useEffect } from 'react'
import { useMoralis, useMoralisQuery } from 'react-moralis'
import { amazonAbi, amazonCoinAddress } from '../lib/constants'
import { ethers } from 'ethers'

type contextType = {
  formattedAccount: string
  isAuthenticated: boolean
  buyTokens: () => void
  getBalance: () => void
  balance: string
  setTokenAmount: (val: string) => void
  tokenAmount: string
  amountDue: string
  setAmountDue: (val: string) => void
  isLoading: boolean
  setIsLoading: (val: boolean) => void
  setEtherscanLink: (link: string) => void
  etherscanLink: string
  buyAsset: (price: number, asset: any) => void
  currentAccount: string
  nickname: string
  setNickname: (val: string) => void
  username: string
  setUsername: (val: string) => void
  handleSetUsername: () => void
  assets: any[]
  recentTransactions: any[]
  ownedItems: any[]
}

const contextDefaultValues: contextType = {
  formattedAccount: '',
  isAuthenticated: false,
  buyTokens: () => {},
  getBalance: () => {},
  balance: '',
  setTokenAmount: (val: string) => {},
  tokenAmount: '',
  amountDue: '',
  setAmountDue: (val: string) => {},
  isLoading: false,
  setIsLoading: (val: boolean) => {},
  setEtherscanLink: (link: string) => {},
  etherscanLink: '',
  buyAsset: (price: number, asset: any) => {},
  currentAccount: '',
  nickname: '',
  setNickname: (val: string) => {},
  username: '',
  setUsername: (val: string) => {},
  handleSetUsername: () => {},
  assets: [],
  recentTransactions: [],
  ownedItems: [],
}

export const AmazonContext = createContext<contextType>(contextDefaultValues)

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
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [ownedItems, setOwnedItems] = useState<any[]>([])

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
      await getOwnedAssets()
    })()
  }, [userData, assetsData])

  useEffect(() => {
    if (!isWeb3Enabled) {
      ;(async () => {
        await enableWeb3()
      })()
    }
    if (isAuthenticated) {
      ;(async () => {
        await getBalance()
        await listenToUpdates()
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
  }, [isWeb3Enabled, isAuthenticated, balance, currentAccount, user, username])

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
        setBalance(response.toString())
      }
    } catch (error) {
      console.log(error)
    }
  }

  const buyAsset = async (price, asset) => {
    try {
      if (!isAuthenticated) return
      const options = {
        type: 'erc20',
        amount: price,
        receiver: amazonCoinAddress,
        contractAddress: amazonCoinAddress,
      }

      let transaction = await Moralis.transfer(options)
      const receipt = await transaction.wait()

      if (receipt) {
        const res = userData[0].add('ownedAsset', {
          ...asset,
          purchaseDate: Date.now(),
          etherscanLink: `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`,
        })

        await res.save().then(() => {
          alert("You've successfully purchased this asset!")
        })
      }
    } catch (error) {
      console.log(error.message)
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

  const listenToUpdates = async () => {
    let query = new Moralis.Query('EthTransactions')
    let subscription = await query.subscribe()
    subscription.on('update', async (object) => {
      console.log('New Transactions')
      console.log(object)
      setRecentTransactions([object])
    })
  }

  const getOwnedAssets = async () => {
    try {
      if (userData[0]) {
        setOwnedItems((prevItems) => [
          ...prevItems,
          userData[0].attributes.ownedAsset,
        ])
      }
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
        buyAsset,
        currentAccount,
        nickname,
        setNickname,
        username,
        setUsername,
        handleSetUsername,
        assets,
        recentTransactions,
        ownedItems,
      }}
    >
      {children}
    </AmazonContext.Provider>
  )
}
