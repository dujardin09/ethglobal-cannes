"use client"

import { useState } from 'react';
import setupStakingCollection from "../../cadence/transactions/SetupStakingCollection.cdc"
import registerDelegator from "../../cadence/transactions/RegisterDelegator.cdc"
import getAllDelegatorInfo from "../../cadence/scripts/GetAllDelegatorInfo.cdc"
import stakeNewToken from "../../cadence/transactions/StakeNewToken.cdc"
import * as fcl from "@onflow/fcl";

export default function Stake() {
	const [txId, setTxId] = useState<string | null>(null);

	const sendTransaction = async () => {
		setTxId(null);

		const authz = fcl.currentUser().authorization;
		const user = await fcl.currentUser().snapshot();

		try {
			const tx1 = await fcl.mutate({
				cadence: setupStakingCollection,
				args: (arg, t) => [],
				proposer: authz,
				payer: authz,
				authorizations: [authz],
				limit: 100,
			})
			console.log(tx1);
			setTxId(tx1);

			await fcl.tx(tx1).onceSealed();
			console.log("setup sealed");

			const allDelegatorInfo = await fcl.query({
				cadence: getAllDelegatorInfo,
					args: (arg, t) => [
					  arg(user?.addr || "", t.Address),
				],
			})

			if (allDelegatorInfo.length > 0) {
				const tx3 = await fcl.mutate({
					cadence: stakeNewToken,
					args: (arg, t) => [
					  arg(allDelegatorInfo[0].nodeID, t.String),
					  arg(allDelegatorInfo[0].id, t.UInt32),
					  arg("100.0", t.UFix64)
				],
					proposer: authz,
					payer: authz,
					authorizations: [authz],
					limit: 100,
				})

				console.log(tx3);
				setTxId(tx3);

				await fcl.tx(tx3).onceSealed();
				console.log("New token added");
			} else {
				const tx3 = await fcl.mutate({
					cadence: registerDelegator,
					args: (arg, t) => [
					  arg("42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3", t.String),
					  arg("100.0", t.UFix64)
				],
					proposer: authz,
					payer: authz,
					authorizations: [authz],
					limit: 100,
				})

				console.log(tx3);
				setTxId(tx3);

				await fcl.tx(tx3).onceSealed();
				console.log("delegator register sealed");
			}

			const result = await fcl.query({
				cadence: getAllDelegatorInfo,
					args: (arg, t) => [
					  arg(user?.addr || "", t.Address),
				],
			})
		} catch (err: any) {
			console.error(err);
		} finally {
			return txId;
		}
  };

	sendTransaction();
}
