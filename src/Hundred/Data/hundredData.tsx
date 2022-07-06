import { useWeb3React } from "@web3-react/core"
import { useEffect, useRef, useState } from "react"
import { Comptroller, getComptrollerData } from "../../Classes/comptrollerClass"
import { useGlobalContext } from "../../Types/globalContext"
import { useHundredDataContext } from "../../Types/hundredDataContext"
import { useUiContext } from "../../Types/uiContext"
import {GaugeV4, getBackstopGaugesData, getGaugesData} from "../../Classes/gaugeV4Class";
import { fetchData } from "./fetchData"
import { CTokenInfo, CTokenSpinner, SpinnersEnum } from "../../Classes/cTokenClass"
import { BigNumber } from "../../bigNumber"
import { GeneralDetailsData, getGeneralDetails } from "../../Classes/generalDetailsClass"
import { CETHER_ABI, COMPTROLLER_ABI, CTOKEN_ABI, GAUGE_V4_ABI, HUNDRED_ABI, TOKEN_ABI } from "../../abi"
import { Contract, Provider } from "ethcall"
import { ethers } from "ethers"

export enum UpdateTypeEnum{
    EnableMarket,
    ApproveMarket,
    Supply
}

const useFetchData = () => {
    const timeoutId = useRef<string | number | NodeJS.Timeout | undefined>()
    const networkId = useRef<number>()
    
    const compAccrued = useRef<BigNumber>()
    const firstLoad = useRef<boolean>(true)
    const errorsCount = useRef<number>(0)
    const update = useRef<boolean>(false)

    const [comptrollerData, setComptrollerData] = useState<Comptroller>()
    const [marketsData, setMarketsData] = useState<CTokenInfo[]>([])
    const [marketsSpinners, setMarketsSpinners] = useState<CTokenSpinner[]>([])
    const [gaugesV4Data, setGaugesV4Data] = useState<GaugeV4[]>([])
    const [generalData, setGeneralData] = useState<GeneralDetailsData>()
    const [selectedMarket, setSelectedMarket] = useState<CTokenInfo>()
    const [selectedMarketSpinners, setSelectedMarketSpinners] = useState<CTokenSpinner>()

    const { setGMessage } = useHundredDataContext()

    const {network, hndPrice, setHndEarned, setHndBalance, setHundredBalance, setVehndBalance, setHndRewards, setGaugeAddresses} = useGlobalContext()
    const {setSpinnerVisible, toastErrorMessage} = useUiContext()
    const {library, chainId, account} = useWeb3React()

    useEffect(() => {
        return () => clearTimeout(Number(timeoutId.current));
    }, [])

    const getComptroller = async () => {
        
        if(network){
            const net = {...network}
            const comptroller = await getComptrollerData(library, net)
            setComptrollerData(comptroller)
        }
    }

    const getMaxAmount = async (market: CTokenInfo, func?: string) : Promise<BigNumber> => {
        const m = {...market}
          if (m.isNativeToken && library) {
            const gasRemainder = BigNumber.parseValue("0.1")
            
            if(func === "repay" && library){
              const balance = m.underlying.walletBalance.subSafe(gasRemainder);
              return balance.gt(BigNumber.from("0")) ? balance : BigNumber.from("0") 
            }
            else if(func === "supply" && library){
              const balance = m.underlying.walletBalance.gt(BigNumber.from("0")) ? m.underlying.walletBalance.subSafe(gasRemainder) : m.underlying.walletBalance
            
              return balance.gt(BigNumber.from("0")) ? balance : BigNumber.from("0") 
            }
          }
          
        return m.underlying.walletBalance
      }

    const updateMarkets = (markets: CTokenInfo[], hndBalance: BigNumber, hundredBalace: BigNumber, compaccrued: BigNumber, vehndBalance: BigNumber, hndRewards: BigNumber, gaugeAddresses: string[]): void =>{
        if(markets){
            compAccrued.current = compaccrued
          
          setMarketsData(markets)
          setHndBalance(hndBalance)
          setHundredBalance(hundredBalace)
          setVehndBalance(vehndBalance)
          setHndRewards(hndRewards)
          setGaugeAddresses(gaugeAddresses)
          if(selectedMarket && markets){
            const selected = {...selectedMarket}
            const market = [...markets].find(x=>x?.underlying.symbol === selected.underlying.symbol)
            if (market){
              setSelectedMarket(market)
            }
          }
        }
        update.current = false
      }

    const getData = async () => {
        if(network && account && comptrollerData){
            const comptroller = {...comptrollerData}
            const net = {...network}
            const gauges = await getGaugesData(library, account, net, () => null)
            const backstopGauges = await getBackstopGaugesData(library, account, net, () => setSpinnerVisible(false))

            const gaugesData = [...gauges, ...backstopGauges]

            const markets = await fetchData({ allMarkets: [...comptroller.allMarkets], userAddress: account, comptrollerData: comptroller, network: net, marketsData: marketsData, provider: library, hndPrice: hndPrice, gaugesData: gaugesData })
          
           
          
            setMarketsData(markets.markets)
            setGaugesV4Data(gaugesData)
          
            
            updateMarkets(markets.markets, markets.hndBalance, markets.hundredBalace, markets.comAccrued, markets.vehndBalance, markets.hndRewards, markets.gaugeAddresses)
            
            if(firstLoad.current){
                const spinners = markets.markets.map(m => {
                    return new CTokenSpinner(m.underlying.symbol)
                  })
                setMarketsSpinners(spinners)
                firstLoad.current = false
                setSpinnerVisible(false)
                const oldGauges = await getGaugesData(library, account, net, () => setSpinnerVisible(false), true)
                if(oldGauges.length > 0){
                    const oldGaugeData: { symbol: string; stakeBalance: BigNumber }[] = []
                    let message = "You have "
                    oldGauges.forEach(g => {
                      if(+g.userStakeBalance.toString() > 0){
                        const market = markets.markets.find(m => m.pTokenAddress.toLowerCase() === g.generalData.lpToken.toLowerCase())
                        if(market){
                          const temp = {
                            symbol: `h${market.underlying.symbol}-Gauge`,
                            stakeBalance: g.userStakeBalance
                          }
                          oldGaugeData.push(temp)
                        }
                      }
                    })

                      oldGaugeData.forEach((g, index) => {
                        message += g.symbol + (index + 1 === oldGaugeData.length ? " " : ", ")
                      })
                      if(oldGaugeData.length > 0){
                        setGMessage(message)
                      }
                }
            }
        }
    }

    const updateData = async () => {
        try{
            update.current = true
            clearTimeout(Number(timeoutId.current));
            await getData()
            timeoutId.current = setTimeout(updateData, 10000)
            errorsCount.current = 0
        }
        catch(error: any){
            if(!firstLoad.current)
                timeoutId.current = setTimeout(updateData, (errorsCount.current < 2 ? errorsCount.current + 1 : errorsCount.current) * 10000 + 10000)
            else{
                if(errorsCount.current < 2)
                    timeoutId.current = setTimeout(updateData, (errorsCount.current + 1) * 1000)
                else if (errorsCount.current === 3)
                    timeoutId.current = setTimeout(updateData, 5000)
                else if (errorsCount.current === 7){
                    if(firstLoad.current) setSpinnerVisible(false)
                    toastErrorMessage(`${error?.message.replace(".", "")} on Page Load\n${error?.data?.message}\nPlease refresh the page after a few minutes.`)
                }
                else
                    timeoutId.current = setTimeout(updateData, 10000)
            } 
            update.current = false
            errorsCount.current += 1
        }
    }

    useEffect(() => {
        clearTimeout(Number(timeoutId.current));
        timeoutId.current = undefined
        firstLoad.current = true
        setComptrollerData(undefined)
        setMarketsData([])
        setGaugesV4Data([])
        setGeneralData(undefined)
        setSelectedMarket(undefined)
        setMarketsSpinners([])
        if(library && network && {...network}.chainId === chainId && account && account != ""){
            networkId.current = {...network}.chainId
            setSpinnerVisible(true)
            getComptroller()
        }
    }, [library, network, account])

    useEffect(() => {
        if(comptrollerData){
            updateData()
        }
    }, [comptrollerData])

    const delay = (n: number) => {
        return new Promise(function(resolve){
            setTimeout(resolve,n*1000);
        });
    }

    useEffect(() => {
        if(marketsData.length > 0 && gaugesV4Data.length > 0 && compAccrued.current !== undefined){
            const markets = [...marketsData]
            const gauges = [...gaugesV4Data]
            const data = getGeneralDetails(markets, gauges, compAccrued.current)
            setGeneralData(data)
            setHndEarned(data.earned)
            if(selectedMarket){
                const selected = {...selectedMarket}
                const market = markets.find(x=> x.underlying.symbol === selected.underlying.symbol)
                console.log("Update selected", selected.underlying.symbol, market?.underlying.symbol)
                if(market){
                    setSelectedMarket(market)
                }
            }
        }
    }, [marketsData, gaugesV4Data, compAccrued.current])

    const toggleSpinners = (symbol: string, spinner: SpinnersEnum) => {
        if(marketsSpinners){
          const spinners = [...marketsSpinners]
          const marketSpinners = spinners.find(s => s.symbol === symbol)
          if(marketSpinners){
            switch (spinner){
              case SpinnersEnum.enterMarket :
                marketSpinners.enterMarketSpinner = !marketSpinners.enterMarketSpinner
                break
              case SpinnersEnum.borrow : 
                marketSpinners.borrowSpinner = !marketSpinners.borrowSpinner
                break
              case SpinnersEnum.repay : 
                marketSpinners.repaySpinner = !marketSpinners.repaySpinner
                break
              case SpinnersEnum.supply :
                marketSpinners.supplySpinner = !marketSpinners.supplySpinner
                break
              case SpinnersEnum.withdraw :
                marketSpinners.withdrawSpinner = !marketSpinners.withdrawSpinner
                break
              case SpinnersEnum.stake :
                marketSpinners.stakeSpinner = !marketSpinners.stakeSpinner
                break
              case SpinnersEnum.unstake :
                marketSpinners.unstakeSpinner = !marketSpinners.unstakeSpinner
                break
              case SpinnersEnum.mint : 
                marketSpinners.mintSpinner = !marketSpinners.mintSpinner
                break
              case SpinnersEnum.backstopDeposit :
                marketSpinners.backstopDepositSpinner = !marketSpinners.backstopDepositSpinner
                break       
              case SpinnersEnum.backstopWithdraw : 
                marketSpinners.backstopWithdrawSpinner = !marketSpinners.backstopWithdrawSpinner
                break
              case SpinnersEnum.backstopClaim :
                marketSpinners.backstopClaimSpinner = !marketSpinners.backstopClaimSpinner
                break              
              }
            marketSpinners.spinner = marketSpinners.enableMainSpinner()
            setMarketsSpinners(spinners)
            if(selectedMarket && {...selectedMarketSpinners}.symbol === marketSpinners.symbol)
              setSelectedMarketSpinners(marketSpinners)
          }
        }
      }

    const stopUpdate = async () :Promise<void> => {
        let count = 0
        while(update.current && count < 20){
            delay(1.5)
            count++
        }
        if(timeoutId){
            clearTimeout(Number(timeoutId.current));
            timeoutId.current = undefined
            console.log("Update stopped")
        }
    }

    const startUpdate = () => {
        timeoutId.current = setTimeout(updateData, 10000)
    }

    const updateMarket = async (market: CTokenInfo, updateType: UpdateTypeEnum, shouldReturn: any): Promise<void> => {
        console.log("Begin Update Market - Try to stop Update")
        stopUpdate()
        console.log("Update Market")
        const net = {...network}
        if(net && net.chainId){
            switch (updateType){
                case UpdateTypeEnum.EnableMarket:
                    await handleEnableMarket(market, shouldReturn, net.chainId)
                    break
                case UpdateTypeEnum.ApproveMarket:
                    await handleMarketApprove(market, net.chainId)
                    break
                case UpdateTypeEnum.Supply:
                    await handleSupply(market, net.chainId)
                    break
            }
        }
        startUpdate()
    }

    const handleMarketApprove = async (market: CTokenInfo, chain: number, count = 0) => {
        if(network && networkId.current === chain && account && library){
            try{
                await delay(5)
                const tokenContract = new ethers.Contract(market.underlying.address, TOKEN_ABI, library)
                const allowance = await tokenContract.allowance(account, market.pTokenAddress)
                const value = BigNumber.from(allowance, market.underlying.decimals)
                if(+value.toString() > +market.underlying.allowance.toString()){
                    console.log("Should Return", value.toString())
                    const markets = [...marketsData]
                    const m = markets.find(x => x.underlying.symbol === market.underlying.symbol)
                    if(m !== undefined && networkId.current === chain){
                        m.underlying.allowance = value
                        setMarketsData(markets)
                        if(selectedMarket && {...selectedMarket}.underlying.symbol === m.underlying.symbol){
                            setSelectedMarket(m)
                        }
                        return value.toString()
                    }
                }
                else {
                    if (count < 20){
                        console.log("Not should return - Retry")
                        await delay(5)
                        await handleMarketApprove(market, chain, count++)
                    }
                }
            }
            catch(err){
                console.log("Error - retry update market")
                console.error(err)
                await delay(5)
                await handleMarketApprove(market, chain, count)
            }
        }
    }

    const handleSupply = async (market: CTokenInfo, chain: number, count = 0) => {
        if(network && networkId.current === chain && account && library){
            try{
                await delay(5)
                const token = market.isNativeToken ? CETHER_ABI : CTOKEN_ABI;
                const ctoken = new ethers.Contract(market.pTokenAddress, token, library);
                    
                const accountSnapshot = await ctoken.getAccountSnapshot(account)
                const accountSnapshot1 = BigNumber.from(accountSnapshot[1].toString(), 18)
                const accountSnapshot3 = BigNumber.from(accountSnapshot[3].toString(), market.underlying.decimals)
                const supplyBalanceInTokenUnit = accountSnapshot1.mul(accountSnapshot3)

                if(+supplyBalanceInTokenUnit.toString() > +market.supplyBalanceInTokenUnit.toString()){
                    console.log("Should Return", supplyBalanceInTokenUnit.toString())
                    const markets = [...marketsData]
                    const m = markets.find(x => x.underlying.symbol === market.underlying.symbol)

                    if(m !== undefined && networkId.current === chain && comptrollerData){
                        const comptroller = {...comptrollerData}
                        let underlyingPrice = market.underlying.price
                        let walletBalance = market.underlying.walletBalance
                        if(market.isNativeToken){
                            const [price] = await comptroller.ethcallProvider.all([comptroller.oracle.getUnderlyingPrice(market.pTokenAddress)])
                            const wallet = await library.getBalance(account)
                            underlyingPrice = BigNumber.from(price, 36-market.underlying.decimals)
                            walletBalance = BigNumber.from(wallet, market.underlying.decimals)
                        }
                        else{
                            const tokenContract = new Contract(market.underlying.address, TOKEN_ABI)
                            const [price, wallet] = await comptroller.ethcallProvider.all(
                                [comptroller.oracle.getUnderlyingPrice(market.pTokenAddress),
                                 tokenContract.balanceOf(account)])

                            underlyingPrice = BigNumber.from(price, 36-market.underlying.decimals)
                            walletBalance = BigNumber.from(wallet, market.underlying.decimals)
                        }

                        if(+walletBalance.toString() < +market.underlying.walletBalance){
                            const supplyBalance = BigNumber.parseValue((+supplyBalanceInTokenUnit.toString() * +underlyingPrice.toString()).noExponents())
                            m.underlying.price = underlyingPrice
                            m.underlying.walletBalance = walletBalance
                            m.supplyBalance = supplyBalance
                            m.supplyBalanceInTokenUnit = supplyBalanceInTokenUnit

                            setMarketsData(markets)
                            
                            return supplyBalance.toString()
                        }
                        else{
                            if (count < 20){
                                console.log("Not should return - Wallet Balance")
                                await delay(5)
                                await handleSupply(market, chain, count++)
                            }        
                        }
                    }
                }
                else {
                    if (count < 20){
                        console.log("Not should return - Retry")
                        await delay(5)
                        await handleSupply(market, chain, count++)
                    }
                }
            }
            catch(err){
                console.log("Error - retry update market")
                console.error(err)
                await delay(5)
                await handleSupply(market, chain, count)
            }
        }
    }

    const handleEnableMarket = async (market: CTokenInfo, shouldReturn: boolean, chain: number, count = 0) => {
        if(network && networkId.current === chain && account && library){
            try{
                await delay(5)
                const net = {...network}
                const ethcallComptroller = new ethers.Contract(net.unitrollerAddress, COMPTROLLER_ABI, library)
                const enteredMarkets = await ethcallComptroller.getAssetsIn(account)
                const isEnterMarket = enteredMarkets.includes(market.pTokenAddress)
                if (isEnterMarket === shouldReturn && marketsData){
                        console.log("Should return", isEnterMarket)
                        const markets = [...marketsData]
                        const m = markets.find(x => x.underlying.symbol === market.underlying.symbol)
                        if(m !== undefined && networkId.current === chain){
                            m.isEnterMarket = isEnterMarket
                            setMarketsData(markets)
                        }
                    console.log("Market Updated")
                    return true
                }
                else {
                    if(count < 20){
                        console.log("Not should return - Retry")
                        await delay(5)
                        await handleEnableMarket(market, shouldReturn, chain, count++)
                    }   
                    else return false
                }
            }
            catch{
                console.log("Error - retry update market")
                await delay(5)
                await handleEnableMarket(market, shouldReturn, chain, count)
            }
        }
     }
     //check that user balance is updated on smart contracts before updating data
    const checkUserBalanceIsUpdated = async (
        currBalanceInput: any,
        action: string,
        tokenContract?: Contract | null | undefined
        ): Promise<any> => { 
        //STEP 1: ethcall setup
        const ethcallProvider = new Provider();
        await ethcallProvider.init(library); //library = provider
        let newBalance: BigNumber;
        const currBalance = BigNumber.from(currBalanceInput);
        const call: any = [];
        //STEP 2: fetch user data
        const selected = {...selectedMarket}
        if (network && selected) {
    
        const gaugeV4 = gaugesV4Data
            ? [...gaugesV4Data].find((x) => x?.generalData.lpTokenUnderlying === selected.underlying?.address)
            : null
    
            if (tokenContract) {
                if (action === "supply" || action === 'withdraw') {
                    call.push(tokenContract.getAccountSnapshot(account)); //returns array of 4 BigNumbers
                } else if (action === 'approveSupply') {
                    call.push(tokenContract.allowance(account, selected.pTokenAddress));
                }            
            } else if (gaugeV4) {
                const gaugeHelper = gaugeV4?.generalData.gaugeHelper;
                const lpTokenUnderlying = gaugeV4?.generalData.lpTokenUnderlying;
                const lpToken = gaugeV4?.generalData.lpToken;
                const gaugeAddress = gaugeV4?.generalData.address;
                if (action === 'stake' || action === 'unstake') {
                    call.push(new Contract(gaugeV4.generalData.address, GAUGE_V4_ABI).balanceOf(account));
                } else if (action === 'claimHnd') {
                    call.push(new Contract(network.hundredAddress, HUNDRED_ABI).balanceOf(account));
                } else if (action === 'approveStake') {
                    if (gaugeHelper && lpTokenUnderlying !== '0x0') {
                        const cTokenContract = new Contract(lpTokenUnderlying, CTOKEN_ABI);
                        call.push(cTokenContract.allowance(account, gaugeHelper));
                    } else {
                        const cTokenContract = new Contract(lpToken, CTOKEN_ABI);
                        call.push(cTokenContract.allowance(account, gaugeAddress));
                    }
                } else if (action === 'approveUnstake') {
                    if (gaugeHelper) {
                        const gaugeContract = new Contract(gaugeAddress, CTOKEN_ABI);
                        call.push(gaugeContract.allowance(account, gaugeHelper));
                    } else {
                        const cTokenContract = new Contract(lpToken, CTOKEN_ABI);
                        call.push(cTokenContract.allowance(account, gaugeAddress));
                    }
                }
                //missing case for borrow and repay
            }
            const newBalanceResult: BigNumber[] = await ethcallProvider.all(call);
            if (action === 'supply' || action === 'withdraw') {
                //Results from the web3@0.20 getAccountSnapshot call must be individually converted into a number or string.
                const getAccountSnapshotString = newBalanceResult[0].toString();
                const getAccountSnapshotArray = getAccountSnapshotString.split(',');
                newBalance = BigNumber.from(getAccountSnapshotArray[1]); //cTokenBalance
            } else {
                newBalance = BigNumber.from(newBalanceResult[0]); //allowance or balance
            }
            //STEP 3: check userBalance has been updated, if not, check again recursively
            if (!newBalance.eq(currBalance)) return true;
            const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
            await delay(2000); //wait 2 seconds, run again
            if (gaugeV4) {
                return await checkUserBalanceIsUpdated(currBalanceInput, action);
            } else {
                return await checkUserBalanceIsUpdated(currBalanceInput, action, tokenContract);
            }
        }
    }

     return{comptrollerData, setComptrollerData, marketsData, setMarketsData, marketsSpinners,
        setMarketsSpinners, gaugesV4Data, setGaugesV4Data, generalData, setGeneralData,
       selectedMarket, setSelectedMarket, selectedMarketSpinners, setSelectedMarketSpinners, toggleSpinners, updateMarket, 
       getMaxAmount, checkUserBalanceIsUpdated}
 }

 export default useFetchData

 