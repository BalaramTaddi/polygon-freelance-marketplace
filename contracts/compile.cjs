const solc = require('solc');
const fs = require('fs');
const path = require('path');

const contractsDir = path.resolve(__dirname, 'contracts');

function getAllSolFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllSolFiles(filePath, fileList);
        } else {
            if (file.endsWith('.sol')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const files = getAllSolFiles(contractsDir);
const sources = {};

files.forEach(filePath => {
    // Create a relative path key like "ccip/Client.sol" or "FreelanceEscrow.sol"
    // This allows import "./ccip/Client.sol" to resolve correctly
    const relativePath = path.relative(contractsDir, filePath).replace(/\\/g, '/');
    sources[relativePath] = {
        content: fs.readFileSync(filePath, 'utf8')
    };
});

const input = {
    language: 'Solidity',
    sources: sources,
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
        outputSelection: {
            '*': {
                '*': ['*']
            }
        }
    }
};

function findImports(importPath) {
    console.log(`Resolving: ${importPath}`);
    let actualPath;

    // Handle OpenZeppelin
    if (importPath.startsWith('@openzeppelin/')) {
        actualPath = path.resolve(__dirname, 'node_modules', importPath);
    }
    // Handle relative local imports that might be falling through
    else {
        actualPath = path.resolve(contractsDir, importPath);
    }

    if (fs.existsSync(actualPath)) {
        return { contents: fs.readFileSync(actualPath, 'utf8') };
    } else {
        // If not found, try standard node resolution (for rare cases)
        try {
            const resolved = require.resolve(importPath, { paths: [__dirname] });
            return { contents: fs.readFileSync(resolved, 'utf8') };
        } catch (e) {
            return { error: 'File not found: ' + importPath };
        }
    }
}

console.log('Compiling...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
    output.errors.forEach(err => {
        console.error(err.formattedMessage);
    });
}

if (output.contracts) {
    for (const fileName in output.contracts) {
        for (const contractName in output.contracts[fileName]) {
            const contract = output.contracts[fileName][contractName];
            const result = {
                abi: contract.abi,
                bytecode: contract.evm.bytecode.object
            };
            const artifactName = `${contractName}.json`;
            fs.writeFileSync(path.resolve(__dirname, artifactName), JSON.stringify(result, null, 2));
            console.log(`Saved ${artifactName}`);
        }
    }
    console.log('Compilation complete.');
} else {
    console.error('Compilation failed or no contract found.');
    process.exit(1);
}
