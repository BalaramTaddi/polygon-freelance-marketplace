const solc = require('solc');
const fs = require('fs');
const path = require('path');

const contractPath = path.resolve(__dirname, 'contracts', 'FreelanceEscrow.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'FreelanceEscrow.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*']
            }
        }
    }
};

function findImports(importPath) {
    let actualPath;
    if (importPath.startsWith('@openzeppelin/')) {
        actualPath = path.resolve(__dirname, 'node_modules', importPath);
    } else {
        actualPath = path.resolve(__dirname, 'contracts', importPath);
    }

    if (fs.existsSync(actualPath)) {
        return { contents: fs.readFileSync(actualPath, 'utf8') };
    } else {
        return { error: 'File not found: ' + actualPath };
    }
}

console.log('Compiling...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
    output.errors.forEach(err => {
        console.error(err.formattedMessage);
    });
}

if (output.contracts && output.contracts['FreelanceEscrow.sol']) {
    const mainContract = output.contracts['FreelanceEscrow.sol']['FreelanceEscrow'];
    const result = {
        abi: mainContract.abi,
        bytecode: mainContract.evm.bytecode.object
    };
    fs.writeFileSync(path.resolve(__dirname, 'FreelanceEscrow.json'), JSON.stringify(result, null, 2));
    console.log('Compiled successfully! Output saved to FreelanceEscrow.json');
} else {
    console.error('Compilation failed or no contract found.');
    process.exit(1);
}
