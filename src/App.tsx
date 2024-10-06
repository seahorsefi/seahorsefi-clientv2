import React, { useState, useEffect } from 'react';
import { lightTheme, darkTheme, Theme } from './theme';
import './App.css';
import { Network } from './networks';
import Spinner from './Components/Spinner/spinner';
import ReactToolTip from 'react-tooltip';
import 'react-toastify/dist/ReactToastify.css';
import { AirdropType } from './Components/AirdropButton/airdropButton';
import Buffer from 'buffer';
import { MyUiContext } from './Types/uiContext';
import { MyGlobalContext } from './Types/globalContext';
import { XFI } from './Connectors/xdefi-connector/declarations';
import Hundred from './Hundred/Views/hundred';
import { toast, ToastContainer } from 'react-toastify';
import { useWindowSize } from 'usehooks-ts';
import { Button, ConfigProvider, Input, Space, theme as antTheme } from 'antd';

declare global {
    interface Window {
        ethereum: any;
        xfi?: XFI;
    }
}

global.Buffer = window.Buffer || Buffer.Buffer;

const App: React.FC = () => {
    const [address, setAddress] = useState<string>('');

    const [network, setNetwork] = useState<Network | null>(null);
    const [hndPrice, setHndPrice] = useState<number>(0);
    const [terraUsd, setTerraUsd] = useState<number>(0);
    const [hasClaimed, setHasClaimed] = useState<boolean>(false);
    const [airdrops, setAirdrops] = useState<AirdropType[]>([]);

    const [updateEarned, setUpdateEarned] = useState<boolean>(false);
    const [claimLegacyHnd, setClaimLegacyHnd] = useState<boolean>(false);
    const [claimHnd, setClaimHnd] = useState<boolean>(false);
    const [claimLockHnd, setClaimLockHnd] = useState<boolean>(false);

    const [sideMenu, setSideMenu] = useState<boolean>(false);
    const [darkMode, setDarkMode] = useState<boolean>(false);
    const [spinnerVisible, setSpinnerVisible] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isTablet, setIsTablet] = useState<boolean>(false);
    const [show, setShow] = useState<boolean>(false);
    const [theme, setTheme] = useState<Theme>(lightTheme);
    const [showWallets, setShowWallets] = useState<boolean>(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const [accountOpen, setAccountOpen] = useState<boolean>(false);

    const [openAddress, setOpenAddress] = useState<boolean>(false);
    const [openNetwork, setOpenNetwork] = useState<boolean>(false);
    const [openHundred, setOpenHundred] = useState<boolean>(false);
    const [openAirdrop, setOpenAirdrop] = useState<boolean>(false);
    const [optimismMessage, setOptimismMessage] = useState<boolean>(false);
    const [airdropSpinner, setAirdropSpinner] = useState<boolean>(false);
    const [switchModal, setSwitchModal] = useState(false);
    const [scale, setScale] = useState(false);

    const { width } = useWindowSize();

    useEffect(() => {
        setShow(true);

        const darkmode = window.localStorage.getItem('hundred-darkmode');

        if (darkmode && darkmode === 'dark') setDarkMode(true);
        else setDarkMode(true);
    }, []);

    useEffect(() => {
        if (show) {
            if (width < (!hasClaimed ? 821 : 925)) {
                setIsMobile(true);
                setIsTablet(false);
            } else if (width < (!hasClaimed ? 1145 : 1325)) {
                console.log('Tablet');
                setScale(false);
                setIsTablet(true);
                setIsMobile(false);
            } else {
                setIsTablet(false);
            }
        }
    }, [width, show]);

    useEffect(() => {
        if (darkMode) {
            window.localStorage.setItem('hundred-darkmode', 'dark');
            setTheme(darkTheme);
        } else {
            window.localStorage.setItem('hundred-darkmode', 'light');
            setTheme(lightTheme);
        }
    }, [darkMode]);

    const toastError = (error: string, autoClose = true, closeDelay = 10000) => {
        toast.error(error, {
            position: 'top-right',
            autoClose: autoClose ? closeDelay : false,
            hideProgressBar: autoClose ? false : true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            icon: true,
        });
    };

    const toastSuccess = (message: string, autoClose = true, closeDelay = 10000) => {
        toast.success(message, {
            position: 'top-right',
            autoClose: autoClose ? closeDelay : false,
            hideProgressBar: autoClose ? false : true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            icon: true,
        });
    };

    return theme ? (
        <ConfigProvider
            theme={{
                // 1. Use dark algorithm
                algorithm: darkMode ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,

                // 2. Combine dark algorithm and compact algorithm
                // algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
            }}
        >
            <Space>
                <MyGlobalContext.Provider
                    value={{
                        network,
                        setNetwork,
                        address,
                        setAddress,
                        hndPrice,
                        setHndPrice,
                        terraUsd,
                        setTerraUsd,
                        hasClaimed,
                        setHasClaimed,
                        airdrops,
                        setAirdrops,
                        updateEarned,
                        setUpdateEarned,
                    }}
                >
                    <MyUiContext.Provider
                        value={{
                            sideMenu,
                            setSideMenu,
                            darkMode,
                            setDarkMode,
                            spinnerVisible,
                            setSpinnerVisible,
                            isMobile,
                            setIsMobile,
                            isTablet,
                            setIsTablet,
                            show,
                            setShow,
                            theme,
                            setTheme,
                            openAddress,
                            setOpenAddress,
                            openNetwork,
                            setOpenNetwork,
                            openHundred,
                            setOpenHundred,
                            openAirdrop,
                            setOpenAirdrop,
                            airdropSpinner,
                            setAirdropSpinner,
                            toastSuccessMessage: toastSuccess,
                            toastErrorMessage: toastError,
                            switchModal,
                            setSwitchModal,
                            scale,
                            setScale,
                            claimLegacyHnd,
                            setClaimLegacyHnd,
                            claimHnd,
                            setClaimHnd,
                            claimLockHnd,
                            setClaimLockHnd,
                            showWallets,
                            setShowWallets,
                            mobileMenuOpen,
                            setMobileMenuOpen,
                            accountOpen,
                            setAccountOpen,
                            optimismMessage,
                            setOptimismMessage,
                        }}
                    >
                        <div id="app" className={`App scroller ${darkMode ? 'dark' : 'light'}`}>
                            <Hundred />
                            <ReactToolTip id="tooltip" effect="solid" />
                            <Spinner />
                        </div>
                        <ToastContainer />
                    </MyUiContext.Provider>
                </MyGlobalContext.Provider>
            </Space>
        </ConfigProvider>
    ) : (
        <div className="App"></div>
    );
};

export default App;
