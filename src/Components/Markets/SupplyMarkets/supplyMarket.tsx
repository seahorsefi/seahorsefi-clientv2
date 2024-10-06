import React, { useEffect } from 'react';
import '../style.css';
import SupplyMarketRow from './supplyMarketRow';
import { compareSymbol, compareLiquidity, compareHndAPR } from '../../../helpers';
import { BigNumber } from '../../../bigNumber';
import { CTokenInfo } from '../../../Classes/cTokenClass';
import ReactTooltip from 'react-tooltip';
import { useHundredDataContext } from '../../../Types/hundredDataContext';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; // optional

import { Space, Switch, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { useWeb3React } from '@web3-react/core';
import { providers } from 'ethers';
import { useUiContext } from '../../../Types/uiContext';

interface Props {
    allAssets: boolean;
    myAssets: boolean;
    searchAssets: string;
    enterMarketDialog: (market: CTokenInfo) => void;
    supplyMarketDialog: (market: CTokenInfo) => void;
}

interface DataType {
    key: string;
    asset: string;
    apr: string;
    suppliedBalance: string;
    walletBalance: string;
    isCollateral: boolean;
    isActive: boolean;
    market: CTokenInfo;
    handleOpenEnterMarkerDialog: () => void;
}

const columns: TableProps<DataType>['columns'] = [
    {
        title: 'Asset',
        dataIndex: 'asset',
        key: 'asset',
        render: (text) => <a>{text}</a>,
    },
    {
        title: 'Active',
        key: 'isActive',
        dataIndex: 'isActive',
        render: (_, { isActive }) => {
            // let color = record.length > 5 ? 'geekblue' : 'green';
            // if (record === 'loser') {
            //     color = 'volcano';
            // }
            const color = isActive ? 'green' : 'volcano';
            const tag = isActive ? 'active' : 'inactive';
            return (
                <>
                    <Tag color={color} key={tag}>
                        {tag.toUpperCase()}
                    </Tag>
                </>
            );
        },
    },
    {
        title: 'Apr',
        dataIndex: 'apr',
        key: 'apr',
        render: (_, { market }) => (
            <a>
                {+market?.totalMaxSupplyApy.toString() > 0
                    ? formatSupplyApyRange(+market.totalMinSupplyApy, +market.totalMaxSupplyApy)
                    : '0.00'}
                %
            </a>
        ),
    },
    {
        title: 'Supplied Balance',
        dataIndex: 'suppliedBalance',
        key: 'suppliedBalance',
        render: (_, { market }) => (
            <a>
                {BigNumber.parseValueSafe(
                    BigNumber.parseValueSafe(market.supplyBalanceInTokenUnit.toString(), market.underlying.decimals)
                        .add(BigNumber.parseValueSafe(market.stakeBalance.toString(), market.underlying.decimals))
                        .toString(),
                    market.underlying.decimals,
                ).toRound(4, true, true)}
            </a>
        ),
    },
    {
        title: 'Walelt Balance',
        dataIndex: 'walletBalance',
        key: 'walletBalance',
        render: (_, { market }) => (
            <a>
                {market
                    ? +market.underlying.walletBalance.toRound(3) === 0 &&
                      +market.underlying.walletBalance.toString() > 0
                        ? '<0.001'
                        : market.underlying.walletBalance.toRound(3)
                    : '0'}
            </a>
        ),
    },
    {
        title: 'Collateral',
        dataIndex: 'isCollateral',
        key: 'isCollateral',
        render: (_, { market, handleOpenEnterMarkerDialog }) => (
            <a>
                {+market.collateralFactor.toString() > 0 && (
                    <Switch value={market?.isEnterMarket} onChange={handleOpenEnterMarkerDialog} />
                )}
            </a>
        ),
    },
];

function formatSupplyApyRange(min: number, max: number) {
    const formattedMin = BigNumber.parseValue((min * 100).noExponents()).toRound(2, false, true);
    const formattedMax = BigNumber.parseValue((max * 100).noExponents()).toRound(2, false, true);

    if (min === max) {
        return formattedMin;
    }
    return `${formattedMin}-${formattedMax}`;
}

const SupplyMarket: React.FC<Props> = (props: Props) => {
    const { marketsData, gaugesV4Data, marketsSpinners } = useHundredDataContext();

    const { setShowWallets } = useUiContext();
    const { account } = useWeb3React<providers.Web3Provider>();

    useEffect(() => {
        ReactTooltip.rebuild();
    });

    const handleOpenEnterMarkerDialog = (market: CTokenInfo) => {
        if (!account) {
            setShowWallets(true);
            return;
        }

        if (market) props.enterMarketDialog(market);
        return;
    };

    const constructData = (cTokenInfos: CTokenInfo[]): DataType[] => {
        return cTokenInfos.map((market) => {
            return {
                key: '1',
                asset: market?.underlying.symbol,
                apr: '',
                suppliedBalance: 'string',
                walletBalance: 'string',
                isCollateral: true,
                isActive: true,
                market: market,
                handleOpenEnterMarkerDialog: () => handleOpenEnterMarkerDialog(market),
            };
        });
    };

    const filledMarkets = [...marketsData]
        ?.filter((item) => {
            const gauge = [...gaugesV4Data].find((x) => x?.generalData.lpTokenUnderlying === item.underlying.address);
            const backstopGauge = [...gaugesV4Data]?.find(
                (g) => g?.generalData.lpTokenUnderlying.toLowerCase() === item?.pTokenAddress.toLowerCase(),
            );

            if (
                item.supplyBalance.gt(BigNumber.from('0')) ||
                item.backstop?.userBalance.gt(BigNumber.from('0')) ||
                gauge?.userStakeBalance.gt(BigNumber.from('0')) ||
                backstopGauge?.userStakeBalance.gt(BigNumber.from('0'))
            )
                return true;
            return false;
        })
        .filter((item) => {
            if (props.searchAssets.trim() === '') return true;
            if (item.underlying.name.toLowerCase().includes(props.searchAssets.toLowerCase().trim())) return true;
            return false;
        })
        .sort(compareSymbol)
        .sort(compareLiquidity)
        .sort(compareHndAPR);

    const contructedFilledData = constructData(filledMarkets);

    console.log('filledMarkets ', filledMarkets);

    const handleOnRowClick = (data: DataType) => {
        console.log('data here', data);
    };

    return (
        <div className="market-content">
            <Table<DataType>
                columns={columns}
                dataSource={contructedFilledData}
                onRow={(r) => ({
                    onClick: () => console.log('r data', r),
                })}
            />
            ;
            <table className="market-table">
                <thead className="market-table-header">
                    <tr>
                        <th colSpan={5}>
                            <div className="seperator" />
                        </th>
                    </tr>
                    <tr className="market-table-header-headers">
                        <th className="market-header-title">Asset</th>
                        <th className="market-header-title">
                            APR
                            <Tippy
                                content={
                                    <div style={{ width: '12rem' }}>
                                        Learn about APR{' '}
                                        <a
                                            className="a"
                                            target="_blank"
                                            rel="noreferrer"
                                            href="https://docs.hundred.finance/protocol-governance/hnd-staking-and-locking/boosting-apr-with-vehnd"
                                        >
                                            here
                                        </a>
                                    </div>
                                }
                                interactive={true}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    className="info-circle"
                                    viewBox="0 0 16 16"
                                    style={{ userSelect: 'none', outline: 'none', cursor: 'pointer' }}
                                >
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                                </svg>
                            </Tippy>
                        </th>

                        <th className="market-header-title">Supplied</th>
                        <th className="market-header-title">Wallet</th>
                        <th className="market-header-title">Collateral</th>
                    </tr>
                    <tr>
                        <th colSpan={5}>
                            <div className="seperator" />
                        </th>
                    </tr>
                </thead>
                {props.myAssets ? (
                    <tbody className="market-table-content">
                        {[...marketsData].length > 0 && [...marketsSpinners].length > 0
                            ? filledMarkets.map((market, index) => {
                                  const spinners = [...marketsSpinners].find(
                                      (x) => x.symbol === market.underlying.symbol,
                                  );
                                  return (
                                      <SupplyMarketRow
                                          key={index}
                                          tooltip={`supply-${index}`}
                                          market={market}
                                          marketSpinners={spinners}
                                          hasbackstopGauge={
                                              [...gaugesV4Data]?.find(
                                                  (g) =>
                                                      g?.generalData.lpTokenUnderlying.toLowerCase() ===
                                                      market?.pTokenAddress.toLowerCase(),
                                              ) !== undefined
                                          }
                                          enterMarketDialog={props.enterMarketDialog}
                                          supplyMarketDialog={props.supplyMarketDialog}
                                      />
                                  );
                              })
                            : null}
                    </tbody>
                ) : props.allAssets ? (
                    <tbody className="market-table-content">
                        {[...marketsData].length > 0 && [...marketsSpinners].length > 0
                            ? [...marketsData]
                                  ?.filter((item) => {
                                      const gauge = [...gaugesV4Data].find(
                                          (x) => x?.generalData.lpTokenUnderlying === item.underlying.address,
                                      );
                                      const backstopGauge = [...gaugesV4Data]?.find(
                                          (g) =>
                                              g?.generalData.lpTokenUnderlying.toLowerCase() ===
                                              item?.pTokenAddress.toLowerCase(),
                                      );

                                      if (
                                          item.supplyBalance.gt(BigNumber.from('0')) ||
                                          item.backstop?.userBalance.gt(BigNumber.from('0')) ||
                                          gauge?.userStakeBalance.gt(BigNumber.from('0')) ||
                                          backstopGauge?.userStakeBalance.gt(BigNumber.from('0'))
                                      )
                                          return true;
                                      return false;
                                  })
                                  .filter((item) => {
                                      if (props.searchAssets.trim() === '') return true;
                                      if (
                                          item.underlying.name
                                              .toLowerCase()
                                              .includes(props.searchAssets.toLowerCase().trim())
                                      )
                                          return true;
                                      return false;
                                  })
                                  .sort(compareSymbol)
                                  .sort(compareLiquidity)
                                  .sort(compareHndAPR)
                                  .map((market, index) => {
                                      const spinners = [...marketsSpinners].find(
                                          (x) => x.symbol === market.underlying.symbol,
                                      );
                                      return (
                                          <SupplyMarketRow
                                              key={index}
                                              tooltip={`supply-${index}`}
                                              market={market}
                                              marketSpinners={spinners}
                                              hasbackstopGauge={
                                                  [...gaugesV4Data]?.find(
                                                      (g) =>
                                                          g?.generalData.lpTokenUnderlying.toLowerCase() ===
                                                          market?.pTokenAddress.toLowerCase(),
                                                  ) !== undefined
                                              }
                                              enterMarketDialog={props.enterMarketDialog}
                                              supplyMarketDialog={props.supplyMarketDialog}
                                          />
                                      );
                                  })
                            : null}

                        {marketsData.length > 0 && marketsSpinners.length > 0
                            ? [...marketsData]
                                  ?.filter((item) => {
                                      const gauge = [...gaugesV4Data].find(
                                          (x) => x?.generalData.lpTokenUnderlying === item.underlying.address,
                                      );
                                      const backstopGauge = [...gaugesV4Data]?.find(
                                          (g) =>
                                              g?.generalData.lpTokenUnderlying.toLowerCase() ===
                                              item?.pTokenAddress.toLowerCase(),
                                      );

                                      if (
                                          item.supplyBalance.gt(BigNumber.from('0')) ||
                                          item.backstop?.userBalance.gt(BigNumber.from('0')) ||
                                          gauge?.userStakeBalance.gt(BigNumber.from('0')) ||
                                          backstopGauge?.userStakeBalance.gt(BigNumber.from('0'))
                                      )
                                          return false;
                                      return true;
                                  })
                                  .filter((item) => {
                                      if (props.searchAssets.trim() === '') return true;
                                      if (
                                          item.underlying.name
                                              .toLowerCase()
                                              .includes(props.searchAssets.toLowerCase().trim()) ||
                                          item.underlying.symbol
                                              .toLowerCase()
                                              .includes(props.searchAssets.toLowerCase().trim())
                                      )
                                          return true;
                                      return false;
                                  })
                                  .sort(compareSymbol)
                                  .sort(compareLiquidity)
                                  .sort(compareHndAPR)
                                  .map((market, index) => {
                                      const spinners = [...marketsSpinners].find(
                                          (x) => x.symbol === market.underlying.symbol,
                                      );
                                      return (
                                          <SupplyMarketRow
                                              key={index}
                                              tooltip={`not-supply-${index}`}
                                              market={market}
                                              marketSpinners={spinners}
                                              hasbackstopGauge={
                                                  [...gaugesV4Data]?.find(
                                                      (g) =>
                                                          g?.generalData.lpTokenUnderlying.toLowerCase() ===
                                                          market?.pTokenAddress.toLowerCase(),
                                                  ) !== undefined
                                              }
                                              enterMarketDialog={props.enterMarketDialog}
                                              supplyMarketDialog={props.supplyMarketDialog}
                                          />
                                      );
                                  })
                            : null}
                    </tbody>
                ) : null}
            </table>
        </div>
    );
};

export default SupplyMarket;
