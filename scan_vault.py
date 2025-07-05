from web3 import Web3
import json
from typing import Dict, List, Set, Optional, Tuple
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

# Configuration
RPC_URL = "https://mainnet.evm.nodes.onflow.org/"
ADDRESS = "0x0000000000000000000000000000000000000000"  # Adresse par défaut

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Vérification de la connexion
if not w3.is_connected():
    print("echec de connexion au réseau Flow EVM")
    exit(1)


# ABI ERC-4626 complet
ERC4626_ABI = [
    # Méthodes ERC-4626 obligatoires
    {"inputs": [], "name": "asset", "outputs": [{"type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "totalAssets", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256", "name": "shares"}], "name": "convertToAssets", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256", "name": "assets"}], "name": "convertToShares", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address", "name": "receiver"}], "name": "maxDeposit", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address", "name": "receiver"}], "name": "maxMint", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address", "name": "owner"}], "name": "maxWithdraw", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address", "name": "owner"}], "name": "maxRedeem", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256", "name": "assets"}], "name": "previewDeposit", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256", "name": "shares"}], "name": "previewMint", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256", "name": "assets"}], "name": "previewWithdraw", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256", "name": "shares"}], "name": "previewRedeem", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    # ERC-20 de base
    {"inputs": [], "name": "name", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "symbol", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "decimals", "outputs": [{"type": "uint8"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "totalSupply", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address", "name": "account"}], "name": "balanceOf", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
]

# Topics des événements ERC-4626
EVENT_TOPICS = {
    "Deposit": w3.keccak(text="Deposit(address,address,uint256,uint256)"),
    "Withdraw": w3.keccak(text="Withdraw(address,address,address,uint256,uint256)"),
    "Transfer": w3.keccak(text="Transfer(address,address,uint256)"),
    "SimpleDeposit": w3.keccak(text="Deposit(address,uint256)"),
    "SimpleWithdraw": w3.keccak(text="Withdraw(address,uint256)"),
}

# Multicall3 ABI (pour optimiser les appels)
MULTICALL3_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"name": "target", "type": "address"},
                    {"name": "callData", "type": "bytes"}
                ],
                "name": "calls",
                "type": "tuple[]"
            }
        ],
        "name": "aggregate",
        "outputs": [
            {"name": "blockNumber", "type": "uint256"},
            {"name": "returnData", "type": "bytes[]"}
        ],
        "stateMutability": "payable",
        "type": "function"
    }
]

# Adresse Multicall3 (standard sur la plupart des chains)
MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11"

class ERC4626Scanner:
    def __init__(self, web3_instance: Web3):
        self.w3 = web3_instance
        self.found_contracts = set()
        self.verified_vaults = {}
        self.failed_contracts = set()
        
    def get_logs_in_chunks(self, from_block: int, to_block: int, chunk_size: int = 10000) -> List:
        """Récupère les logs par chunks pour éviter les timeouts"""
        all_logs = []
        
        for start_block in range(from_block, to_block + 1, chunk_size):
            end_block = min(start_block + chunk_size - 1, to_block)
            
            try:
                # Approche 1: Recherche par topic spécifique
                for event_name, topic in EVENT_TOPICS.items():
                    try:
                        logs = self.w3.eth.get_logs({
                            "fromBlock": start_block,
                            "toBlock": end_block,
                            "topics": [topic]
                        })
                        
                        all_logs.extend(logs)
                        
                        # Pause pour éviter le rate limiting
                        time.sleep(0.1)
                        
                    except Exception as e:
                        # Approche alternative: récupérer tous les logs et filtrer manuellement
                        try:
                            all_logs_chunk = self.w3.eth.get_logs({
                                "fromBlock": start_block,
                                "toBlock": end_block
                            })
                            
                            # Filtrer manuellement par topic
                            filtered_logs = []
                            for log in all_logs_chunk:
                                if len(log['topics']) > 0 and log['topics'][0] == topic:
                                    filtered_logs.append(log)
                            
                            all_logs.extend(filtered_logs)
                            
                        except Exception as e2:
                            pass
                        
                        continue
                        
            except Exception as e:
                continue
                
        return all_logs
    
    def extract_contract_addresses(self, logs: List) -> Set[str]:
        """Extrait les adresses de contrats des logs"""
        addresses = set()
        
        for log in logs:
            # Ajouter l'adresse du contrat émetteur
            addresses.add(log['address'])
            
            # Pour les événements Transfer, vérifier si c'est un mint (from = 0x0)
            if len(log['topics']) >= 3:
                if log['topics'][0] == EVENT_TOPICS["Transfer"]:
                    from_addr = log['topics'][1].hex()
                    if from_addr == "0x" + "0" * 64:  # Address zero (mint)
                        addresses.add(log['address'])
        
        return addresses
    
    def check_erc4626_methods(self, address: str) -> Tuple[bool, Dict, List[str]]:
        """Vérifie si un contrat implémente les méthodes ERC-4626"""
        try:
            checksum_address = Web3.to_checksum_address(address)
            contract = self.w3.eth.contract(address=checksum_address, abi=ERC4626_ABI)
            
            # Méthodes critiques ERC-4626
            critical_methods = ['asset', 'totalAssets', 'convertToAssets', 'convertToShares']
            # Méthodes ERC-20 de base
            erc20_methods = ['name', 'symbol', 'decimals', 'totalSupply']
            
            vault_info = {}
            failed_methods = []
            
            # Test des méthodes critiques
            for method in critical_methods:
                try:
                    if method in ['convertToAssets', 'convertToShares']:
                        # Test avec une valeur petite
                        result = getattr(contract.functions, method)(10**6).call()
                    else:
                        result = getattr(contract.functions, method)().call()
                    
                    vault_info[method] = result
                    
                except Exception as e:
                    failed_methods.append(method)
            
            # Test des méthodes ERC-20 de base
            for method in erc20_methods:
                try:
                    result = getattr(contract.functions, method)().call()
                    vault_info[method] = result
                except Exception:
                    failed_methods.append(method)
            
            # Un vault ERC-4626 doit au minimum avoir asset() et totalAssets()
            is_valid = 'asset' in vault_info and 'totalAssets' in vault_info
            
            return is_valid, vault_info, failed_methods
            
        except Exception as e:
            return False, {}, ["all"]
    
    def get_additional_vault_info(self, address: str, vault_info: Dict) -> Dict:
        """Récupère des informations supplémentaires sur le vault"""
        try:
            checksum_address = Web3.to_checksum_address(address)
            contract = self.w3.eth.contract(address=checksum_address, abi=ERC4626_ABI)
            
            # Calculer des métriques utiles
            additional_info = vault_info.copy()
            
            # Ratio actifs/shares (prix par share)
            if 'totalAssets' in vault_info and 'totalSupply' in vault_info:
                total_assets = vault_info['totalAssets']
                total_supply = vault_info['totalSupply']
                
                if total_supply > 0:
                    share_price = total_assets / total_supply
                    additional_info['share_price'] = share_price
                    additional_info['total_assets_formatted'] = self.w3.from_wei(total_assets, 'ether')
                    additional_info['total_supply_formatted'] = self.w3.from_wei(total_supply, 'ether')
            
            # Essayer de récupérer des infos sur l'asset sous-jacent
            if 'asset' in vault_info:
                try:
                    asset_address = vault_info['asset']
                    asset_contract = self.w3.eth.contract(
                        address=Web3.to_checksum_address(asset_address), 
                        abi=ERC4626_ABI
                    )
                    
                    asset_name = asset_contract.functions.name().call()
                    asset_symbol = asset_contract.functions.symbol().call()
                    asset_decimals = asset_contract.functions.decimals().call()
                    
                    additional_info['asset_name'] = asset_name
                    additional_info['asset_symbol'] = asset_symbol
                    additional_info['asset_decimals'] = asset_decimals
                    
                except Exception:
                    pass
            
            return additional_info
            
        except Exception as e:
            return vault_info
    
    def scan_for_vaults(self, blocks_to_scan: int = 50000) -> Dict:
        """Scanner principal pour trouver les vaults ERC-4626"""
        current_block = self.w3.eth.block_number
        from_block = max(0, current_block - blocks_to_scan)
        
        print(f"Scanning blocks {from_block} to {current_block}")
        
        # Étape 1: Récupérer les logs
        all_logs = self.get_logs_in_chunks(from_block, current_block)
        
        # Étape 2: Extraire les adresses de contrats
        contract_addresses = self.extract_contract_addresses(all_logs)
        self.found_contracts.update(contract_addresses)
        
        # Étape 3: Vérifier chaque contrat
        valid_vaults = {}
        
        for i, address in enumerate(contract_addresses, 1):
            is_valid, vault_info, failed = self.check_erc4626_methods(address)
            
            if is_valid:
                # Récupérer des infos supplémentaires
                enhanced_info = self.get_additional_vault_info(address, vault_info)
                
                valid_vaults[address] = enhanced_info
                self.verified_vaults[address] = enhanced_info
                    
            else:
                self.failed_contracts.add(address)
            
            # Pause pour éviter le spam
            time.sleep(0.1)
        
        return valid_vaults
    
    def display_results(self, vaults: Dict):
        """Affiche les résultats finaux et les sauvegarde dans un fichier JSON"""
        # Préparer les données pour le JSON
        results_data = {
            "scan_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_vaults_found": len(vaults),
            "vaults": []
        }
        
        if vaults:
            print(f"\nFound {len(vaults)} ERC-4626 vault(s):")
            
            for i, (address, info) in enumerate(vaults.items(), 1):
                print(f"\n{i}. {address}")
                print(f"   Name: {info.get('name', 'N/A')}")
                print(f"   Symbol: {info.get('symbol', 'N/A')}")
                print(f"   Asset: {info.get('asset_symbol', 'N/A')} ({info.get('asset', 'N/A')})")
                
                if 'total_assets_formatted' in info:
                    print(f"   TVL: {info['total_assets_formatted']:.4f} tokens")
                if 'total_supply_formatted' in info:
                    print(f"   Supply: {info['total_supply_formatted']:.4f} shares")
                if 'share_price' in info:
                    print(f"   Share price: {info['share_price']:.6f}")
                
                # Préparer les données du vault pour le JSON
                vault_data = {
                    "address": address,
                    "name": info.get('name', 'N/A'),
                    "symbol": info.get('symbol', 'N/A'),
                    "asset": info.get('asset', 'N/A'),
                    "asset_name": info.get('asset_name', 'N/A'),
                    "asset_symbol": info.get('asset_symbol', 'N/A'),
                    "asset_decimals": info.get('asset_decimals', 'N/A'),
                    "total_assets": str(info.get('totalAssets', 'N/A')),
                    "total_supply": str(info.get('totalSupply', 'N/A')),
                    "total_assets_formatted": info.get('total_assets_formatted', 'N/A'),
                    "total_supply_formatted": info.get('total_supply_formatted', 'N/A'),
                    "share_price": info.get('share_price', 'N/A'),
                    "decimals": info.get('decimals', 'N/A')
                }
                results_data["vaults"].append(vault_data)
                    
        else:
            print("No ERC-4626 vaults found")
        
        # Sauvegarder les résultats dans un fichier JSON
        try:
            filename = f"ai-agent-frontend/data/erc4626_vaults_scan_{time.strftime('%Y%m%d_%H%M%S')}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(results_data, f, indent=2, ensure_ascii=False, default=str)
            print(f"\nRésultats sauvegardés dans: {filename}")
        except Exception as e:
            print(f"\nErreur lors de la sauvegarde: {e}")

# Fonction principale
def main():
    scanner = ERC4626Scanner(w3)
    
    # Scanner avec une plage plus large
    vaults = scanner.scan_for_vaults(blocks_to_scan=20000)
    
    # Afficher les jats
    scanner.display_results(vaults)

if __name__ == "__main__":
    main()