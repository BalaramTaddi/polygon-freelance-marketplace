import { ethers } from 'ethers';

const EIP712Domain = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
];

const ForwardRequest = [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' },
];

export async function signMetaTx(signer, forwarder, request) {
    const chainId = (await signer.provider.getNetwork()).chainId;
    const domain = {
        name: 'PolyLanceForwarder',
        version: '0.0.1',
        chainId,
        verifyingContract: forwarder.address,
    };

    const types = {
        ForwardRequest,
    };

    const signature = await signer._signTypedData(domain, types, request);
    return signature;
}

/**
 * Example usage:
 * 1. Get nonce from Forwarder contract
 * 2. Build request: { from, to, value: 0, gas, nonce, data: contract.interface.encodeFunctionData(...) }
 * 3. Sign and send to backend relayer
 */
