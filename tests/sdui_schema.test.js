'use strict';

const { sduiEngine, sduiSchemaValidator } = require('../src/ui/sdui');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

async function testValidation() {
    try {
        const validSchema = {
            title: 'Dettaglio Paziente',
            root: {
                id: 'main_container',
                type: 'container',
                children: [
                    {
                        id: 'personal_card',
                        type: 'card',
                        props: { title: 'Dati Anagrafici' },
                        children: [
                            {
                                id: 'txt_name',
                                type: 'text-input',
                                binding: 'patient.fullName',
                                props: { label: 'Nome Completo', required: true }
                            },
                            {
                                id: 'btn_save',
                                type: 'button',
                                props: { label: 'Salva Cartella', action: 'salva_paziente' }
                            }
                        ]
                    }
                ]
            }
        };

        const resValid = sduiSchemaValidator.validateViewSchema(validSchema);
        check('SDUI Validator: convalida schema dichiarativo valido', resValid.valid === true && resValid.errors.length === 0);

        const invalidSchema = {
            title: 'Vista Errata',
            root: {
                id: 'root_item',
                type: 'tipo_inesistente'
            }
        };

        const resInvalid = sduiSchemaValidator.validateViewSchema(invalidSchema);
        check('SDUI Validator: respinge schema con tipo componente non supportato', resInvalid.valid === false && resInvalid.errors.length > 0);
    } catch (e) {
        check('testValidation error: ' + e.message, false);
    }
}

async function testRenderingAndBinding() {
    try {
        const schema = {
            title: 'Cruscotto Medico',
            root: {
                id: 'root_box',
                type: 'container',
                children: [
                    {
                        id: 'stat_pazienti',
                        type: 'stat-metric',
                        binding: 'stats.totalPatients',
                        props: { label: 'Totale Pazienti In Cura' }
                    },
                    {
                        id: 'doctor_input',
                        type: 'text-input',
                        binding: 'doctor.info.specialty',
                        props: { label: 'Specializzazione' }
                    }
                ]
            }
        };

        const state = {
            stats: { totalPatients: 142 },
            doctor: {
                info: { specialty: 'Ortodonzia' }
            }
        };

        const rendered = sduiEngine.renderToDescriptor(schema, state);
        check('SDUI Engine: genera albero dei descrittori con successo', rendered.success === true && rendered.tree.id === 'root_box');

        const statChild = rendered.tree.children.find(c => c.id === 'stat_pazienti');
        check('SDUI Engine: risolve data binding a singolo livello', statChild && statChild.value === 142);

        const nestedChild = rendered.tree.children.find(c => c.id === 'doctor_input');
        check('SDUI Engine: risolve data binding nidificato (doctor.info.specialty)', nestedChild && nestedChild.value === 'Ortodonzia');
    } catch (e) {
        check('testRenderingAndBinding error: ' + e.message, false);
    }
}

async function testActionDispatch() {
    try {
        let actionExecuted = false;
        let receivedPayload = null;

        sduiEngine.registerActionHandler('conferma_visita', async (payload, state) => {
            actionExecuted = true;
            receivedPayload = payload;
            return { confirmed: true, patientId: payload.id };
        });

        const dispatchResult = await sduiEngine.dispatchAction('conferma_visita', { id: 'p_88' }, {});
        check('SDUI Engine: inoltra azione dichiarativa e raccoglie risultato',
            dispatchResult.success === true && actionExecuted === true && dispatchResult.result.patientId === 'p_88');
    } catch (e) {
        check('testActionDispatch error: ' + e.message, false);
    }
}

async function runAll() {
    try {
        await testValidation();
        await testRenderingAndBinding();
        await testActionDispatch();

        if (failures > 0) {
            console.log(`\nTEST FALLITI: ${failures}`);
            process.exit(1);
        } else {
            console.log('\nTUTTI I TEST SERVER-DRIVEN UI SUPERATI CON SUCCESSO');
            process.exit(0);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAll();
