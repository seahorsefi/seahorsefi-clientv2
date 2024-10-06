import React from 'react';
import BorrowMarketRow from './borrowMarketRow';
import { compareHndAPR, compareLiquidity, compareSymbol } from '../../../helpers';

import '../style.css';
import { CTokenInfo, CTokenSpinner } from '../../../Classes/cTokenClass';
import { BigNumber } from '../../../bigNumber';
import { useHundredDataContext } from '../../../Types/hundredDataContext';

import { Avatar, Space, Switch, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { useWeb3React } from '@web3-react/core';
import { providers } from 'ethers';
import { useUiContext } from '../../../Types/uiContext';

interface Props {
    allAssets: boolean;
    myAssets: boolean;
    searchAssets: string;
    borrowMarketDialog: (market: CTokenInfo) => void;
}

interface DataType {
    key: string;
    asset: string;
    isActive: boolean;
    market: CTokenInfo;
}

const columns: TableProps<DataType>['columns'] = [
    {
        title: 'Asset',
        dataIndex: 'asset',
        key: 'asset',
        render: (_, { market }) => (
            <div className="flex items-center space-x-[10px]">
                <Avatar
                    style={{ verticalAlign: 'middle', objectFit: 'fill' }}
                    size="default"
                    src={market.underlying.logo}
                ></Avatar>
                <a>{market.underlying.symbol}</a>
            </div>
        ),
    },
    // {
    //     title: 'Active',
    //     key: 'isActive',
    //     dataIndex: 'isActive',
    //     render: (_, { isActive }) => {
    //         const color = isActive ? 'green' : 'volcano';
    //         const tag = isActive ? 'active' : 'inactive';
    //         return (
    //             <>
    //                 <Tag color={color} key={tag}>
    //                     {tag.toUpperCase()}
    //                 </Tag>
    //             </>
    //         );
    //     },
    // },
    {
        title: 'Apr',
        dataIndex: 'apr',
        key: 'apr',
        render: (_, { market }) => (
            <a>{`${market ? market.borrowApy.mul(BigNumber.from('100')).toFixed(2) : '0.00'}%`}</a>
        ),
    },
    {
        title: 'Borrowed Balance',
        dataIndex: 'borrowedBalance',
        key: 'borrowedBalance',
        render: (_, { market }) => (
            <a>
                {market
                    ? +market.borrowBalanceInTokenUnit.toString() > 0.001 ||
                      +market.borrowBalanceInTokenUnit.toString() === 0
                        ? +market.borrowBalanceInTokenUnit.toFixed(4)
                        : '<0.001'
                    : '0'}
            </a>
        ),
    },
    {
        title: 'Wallet Balance',
        dataIndex: 'walletBalance',
        key: 'walletBalance',
        render: (_, { market }) => <a>{market ? +market.underlying.walletBalance.toRound(3).toString() : '0'}</a>,
    },

    {
        title: 'Liquidity',
        dataIndex: 'liquidity',
        key: 'liquidity',
        render: (_, { market }) => (
            <a>{`${market ? market.liquidity.convertToLargeNumberRepresentation(3, '$') : '$0'}`}</a>
        ),
    },
];

const BorrowMarket: React.FC<Props> = (props: Props) => {
    const { marketsData, marketsSpinners } = useHundredDataContext();

    const { setShowWallets } = useUiContext();
    const { account } = useWeb3React<providers.Web3Provider>();

    const filledMarkets = [...marketsData]
        ?.filter((item) => item?.borrowBalance?.gt(BigNumber.from('0')))
        .filter((item) => {
            if (props.searchAssets.trim() === '') return true;
            if (
                item.underlying.name.toLowerCase().includes(props.searchAssets.toLowerCase().trim()) ||
                item.underlying.symbol.toLowerCase().includes(props.searchAssets.toLowerCase().trim())
            )
                return true;
            return false;
        })
        .sort(compareSymbol)
        .sort(compareLiquidity)
        .sort(compareHndAPR);

    const unfilledMarkets = [...marketsData]
        ?.filter((item) => item?.borrowBalance?.lte(BigNumber.from('0')))
        .filter((item) => {
            if (props.searchAssets.trim() === '') return true;
            if (
                item.underlying.name.toLowerCase().includes(props.searchAssets.toLowerCase().trim()) ||
                item.underlying.symbol.toLowerCase().includes(props.searchAssets.toLowerCase().trim())
            )
                return true;
            return false;
        })
        .sort(compareSymbol)
        .sort(compareLiquidity)
        .sort(compareHndAPR);

    const constructData = (cTokenInfos: CTokenInfo[]): DataType[] => {
        return cTokenInfos.map((market) => {
            return {
                key: '1',
                asset: market?.underlying.symbol,
                isActive: true,
                market: market,
            };
        });
    };

    const contructedFilledData = constructData(filledMarkets);

    const contructedUnFilledData = constructData(unfilledMarkets);

    const handleOpenBorrowMarketDialog = (market: CTokenInfo, spinners?: CTokenSpinner) => {
        if (!account) {
            setShowWallets(true);
            return;
        }

        if (market && !spinners?.spinner) {
            props.borrowMarketDialog(market);
        }
        return;
    };

    const handleOnRowClick = (data: DataType) => {
        const spinners = [...marketsSpinners].find((x) => x.symbol === data.market.underlying.symbol);

        handleOpenBorrowMarketDialog(data.market, spinners);
    };

    return (
        <div className="market-content">
            <Table<DataType>
                columns={columns}
                dataSource={contructedFilledData.concat(contructedUnFilledData)}
                onRow={(r) => ({
                    onClick: () => handleOnRowClick(r),
                })}
            />
        </div>
    );
};

export default BorrowMarket;

// <table className="market-table">
// <thead className="market-table-header">
//     <tr>
//         <th colSpan={5}>
//             <div className="seperator" />
//         </th>
//     </tr>
//     <tr className="market-table-header-headers">
//         <th className="market-header-title">Asset</th>
//         <th className="market-header-title">APY</th>
//         <th className="market-header-title">Borrowed</th>
//         <th className="market-header-title">Wallet</th>
//         <th className="market-header-title">Liquidity</th>
//     </tr>
//     <tr>
//         <th colSpan={5}>
//             <div className="seperator" />
//         </th>
//     </tr>
// </thead>
// {props.myAssets ? (
//     <tbody className="market-table-content">
//         {marketsData.length > 0 && marketsSpinners.length > 0
//             ? [...marketsData]
//                   ?.filter((item) => item?.borrowBalance?.gt(BigNumber.from('0')))
//                   .filter((item) => {
//                       if (props.searchAssets.trim() === '') return true;
//                       if (
//                           item.underlying.name
//                               .toLowerCase()
//                               .includes(props.searchAssets.toLowerCase().trim()) ||
//                           item.underlying.symbol
//                               .toLowerCase()
//                               .includes(props.searchAssets.toLowerCase().trim())
//                       )
//                           return true;
//                       return false;
//                   })
//                   .sort(compareSymbol)
//                   .sort(compareLiquidity)
//                   .sort(compareHndAPR)
//                   .map((market, index) => {
//                       const spinners = [...marketsSpinners].find(
//                           (x) => x.symbol === market.underlying.symbol,
//                       );
//                       return (
//                           <BorrowMarketRow
//                               key={index}
//                               market={market}
//                               marketSpinners={spinners}
//                               borrowMarketDialog={props.borrowMarketDialog}
//                           />
//                       );
//                   })
//             : null}
//     </tbody>
// ) : props.allAssets ? (
//     <tbody className="market-table-content">
//         {marketsData.length > 0 && marketsSpinners.length > 0
//             ? [...marketsData]
//                   ?.filter((item) => item?.borrowBalance?.gt(BigNumber.from('0')))
//                   .filter((item) => {
//                       if (props.searchAssets.trim() === '') return true;
//                       if (
//                           item.underlying.name
//                               .toLowerCase()
//                               .includes(props.searchAssets.toLowerCase().trim()) ||
//                           item.underlying.symbol
//                               .toLowerCase()
//                               .includes(props.searchAssets.toLowerCase().trim())
//                       )
//                           return true;
//                       return false;
//                   })
//                   .sort(compareSymbol)
//                   .sort(compareLiquidity)
//                   .sort(compareHndAPR)
//                   .map((market, index) => {
//                       const spinners = [...marketsSpinners].find(
//                           (x) => x.symbol === market.underlying.symbol,
//                       );
//                       return (
//                           <BorrowMarketRow
//                               key={index}
//                               market={market}
//                               marketSpinners={spinners}
//                               borrowMarketDialog={props.borrowMarketDialog}
//                           />
//                       );
//                   })
//             : null}
//         {marketsData.length > 0 && marketsSpinners.length > 0
//             ? [...marketsData]
//                   ?.filter((item) => item?.borrowBalance?.lte(BigNumber.from('0')))
//                   .filter((item) => {
//                       if (props.searchAssets.trim() === '') return true;
//                       if (
//                           item.underlying.name
//                               .toLowerCase()
//                               .includes(props.searchAssets.toLowerCase().trim()) ||
//                           item.underlying.symbol
//                               .toLowerCase()
//                               .includes(props.searchAssets.toLowerCase().trim())
//                       )
//                           return true;
//                       return false;
//                   })
//                   .sort(compareSymbol)
//                   .sort(compareLiquidity)
//                   .sort(compareHndAPR)
//                   .map((market, index) => {
//                       const spinners = [...marketsSpinners].find(
//                           (x) => x.symbol === market.underlying.symbol,
//                       );
//                       return (
//                           <BorrowMarketRow
//                               key={index}
//                               market={market}
//                               marketSpinners={spinners}
//                               borrowMarketDialog={props.borrowMarketDialog}
//                           />
//                       );
//                   })
//             : null}
//     </tbody>
// ) : null}
// </table>
