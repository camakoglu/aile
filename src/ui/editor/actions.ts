import * as d3 from 'd3';
import { D3Node } from '../../types/types';
import { store } from '../../services/state/store';
import { UPLOAD_SCRIPT_URL, COLUMN_MAPPING } from './config';
import { uploadPhoto } from './image';
import { pendingChildPhoto, setPendingChildPhoto } from './state';
import { get_name } from '../../components/Tree/dagWithFamilyData';

export async function saveData(node: D3Node, updates: any) {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.innerText = "Kaydediliyor...";
        statusEl.style.color = "orange";
    }

    try {
        const memberData = (node.added_data as any).input;
        let sheetRow: number;

        if (memberData && memberData.row_index) {
            sheetRow = memberData.row_index;
        } else if (node.data.startsWith("mem_")) {
            const memberId = parseInt(node.data.split("_")[1]);
            sheetRow = memberId + 2;
        } else {
            throw new Error("Satır numarası bulunamadı.");
        }

        const payload = {
            row: sheetRow,
            updates: updates
        };

        await fetch(UPLOAD_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        // Optimistic Update: Update local data and UI immediately
        if (!(node.added_data as any).input) (node.added_data as any).input = {};
        for (const [key, val] of Object.entries(updates)) {
            // key here is the 1-based column index (e.g., "2" for first_name)
            // We need to map it back to the property name (e.g., "first_name")
            const propName = Object.keys(COLUMN_MAPPING).find(prop => COLUMN_MAPPING[prop] == parseInt(key));
            if (propName) {
                (node.added_data as any).input[propName] = val;
            }
        }

        // Reconstruct Full Name for display if first_name or last_name changed
        if (updates[COLUMN_MAPPING['first_name']] !== undefined || updates[COLUMN_MAPPING['last_name']] !== undefined) {
            const f = (node.added_data as any).input['first_name'] || "";
            const l = (node.added_data as any).input['last_name'] || "";
            (node.added_data as any).input['name'] = (f + " " + l).trim();

            // Update Sidebar Title
            const titleEl = document.getElementById('sidebar-title');
            if (titleEl) titleEl.innerText = (node.added_data as any).input['name'];
        }

        // Update tree node image if photo was deleted
        if (updates[COLUMN_MAPPING['image_path']] === "") {
            d3.selectAll<SVGGElement, D3Node>("g.node")
                .filter(d => d.data === node.data)
                .select("image")
                .attr("href", "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png");
        }

        if (statusEl) {
            statusEl.innerText = "Kaydedildi! (Kalıcı olması 5-10 dk sürebilir)";
            statusEl.style.color = "green";
            setTimeout(() => statusEl.innerText = "", 5000);
        }

    } catch (e: any) {
        console.error(e);
        if (statusEl) {
            statusEl.innerText = "Hata: " + e.message;
            statusEl.style.color = "red";
        }
    }
}

export async function submitNewChild(node: D3Node) {
    const statusEl = document.getElementById('add-status');
    if (!statusEl) return;

    // 1. Collect Data
    const inputs = document.querySelectorAll('#sidebar-details input.sidebar-input');
    const updates: any = {};
    let hasName = false;

    inputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        const val = (inp as HTMLInputElement).value;
        if (val && key) {
            if (key === 'first_name') hasName = true;
            const colIndex = COLUMN_MAPPING[key];
            if (colIndex) updates[colIndex] = val;
        }
    });

    if (!hasName) {
        alert("Lütfen en azından bir isim (Ad) girin.");
        return;
    }

    const familyData = store.getState().familyData;
    if (!familyData || !familyData.members) {
        alert("Veri yüklenemedi.");
        return;
    }

    // Build Row Map
    const rowMap = new Map<number, any>();
    Object.values(familyData.members).forEach((m: any) => {
        if (m.row_index) rowMap.set(m.row_index, m);
    });

    const clickedMemberData = (node.added_data as any).input;
    if (!clickedMemberData || !clickedMemberData.row_index) {
        alert("Seçilen kişi için satır verisi bulunamadı.");
        return;
    }

    // 2. Calculate Anchor & Parents
    let anchorRow = clickedMemberData.row_index;
    const isClickedNodeSpouse = clickedMemberData.is_spouse;

    if (isClickedNodeSpouse) {
        // Find the main parent (walk back rows)
        let tempRow = anchorRow - 1;
        while (tempRow > 0) {
            const m = rowMap.get(tempRow);
            if (!m) break; // Should not happen if rows are contiguous
            if (!m.is_spouse) {
                anchorRow = tempRow;
                break;
            }
            tempRow--;
        }
    }

    const anchorNode = rowMap.get(anchorRow);
    if (!anchorNode) {
        alert("Hata: Ebeveyn bulunamadı.");
        return;
    }
    const anchorGen = anchorNode.gen;
    if (anchorGen === undefined) {
        alert("Hata: Ebeveyn jenerasyonu bilinmiyor.");
        return;
    }

    // 3. Calculate Insertion Point
    let insertAfterRow = anchorRow;
    let checkRow = anchorRow + 1;

    while (true) {
        const nextMem = rowMap.get(checkRow);
        if (!nextMem) break; // End of list

        if (nextMem.is_spouse) {
            insertAfterRow = checkRow;
            checkRow++;
            continue;
        }

        if (nextMem.gen !== undefined && nextMem.gen > anchorGen) {
            insertAfterRow = checkRow;
            checkRow++;
            continue;
        }
        break;
    }

    const childGen = anchorGen + 1;

    // 4. Add System Fields to Updates
    updates[COLUMN_MAPPING['gen_col']] = childGen;

    // Determine mother and father based on gender
    const anchorGender = anchorNode.gender || 'E';

    if (isClickedNodeSpouse) {
        // Both anchor and clicked node are parents
        if (anchorGender === 'E') {
            updates[COLUMN_MAPPING['father']] = anchorNode.first_name;
            updates[COLUMN_MAPPING['mother']] = clickedMemberData.first_name;
        } else {
            updates[COLUMN_MAPPING['father']] = clickedMemberData.first_name;
            updates[COLUMN_MAPPING['mother']] = anchorNode.first_name;
        }
    } else {
        // Only anchor node, clicked node is non-spouse
        if (anchorGender === 'E') {
            updates[COLUMN_MAPPING['father']] = anchorNode.first_name;
        } else {
            updates[COLUMN_MAPPING['mother']] = anchorNode.first_name;
        }
    }

    // 5. Send Request
    statusEl.innerText = "Ekleniyor...";
    statusEl.style.color = "orange";

    try {
        const payload = {
            action: "addChild",
            row: insertAfterRow,
            updates: updates
        };

        await fetch(UPLOAD_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        statusEl.innerText = "Çocuk eklendi!";
        statusEl.style.color = "green";

        // If a photo was selected, upload it now
        if (pendingChildPhoto) {
            statusEl.innerText = "Çocuk eklendi! Fotoğraf yükleniyor...";
            statusEl.style.color = "orange";

            try {
                const newChildRow = insertAfterRow + 1;
                // Create temp node with row_index for uploadPhoto
                const tempNode: any = {
                    data: "temp_child",
                    added_data: {
                        input: { row_index: newChildRow }
                    }
                };

                await uploadPhoto(pendingChildPhoto, tempNode);

                statusEl.innerText = "Başarılı! Fotoğraf yüklendi. Sayfayı yenileyin.";
                statusEl.style.color = "green";
                alert("Çocuk ve fotoğraf eklendi. Lütfen sayfayı yenileyin.");

            } catch (photoError: any) {
                console.error("Photo upload error:", photoError);
                statusEl.innerText = "Çocuk eklendi ama fotoğraf yüklenemedi. Sayfayı yenileyip tekrar deneyin.";
                statusEl.style.color = "orange";
                alert("Çocuk eklendi ama fotoğraf yüklenemedi. Lütfen sayfayı yenileyip fotoğrafı tekrar ekleyin.");
            }

            setPendingChildPhoto(null);
            const sidebarImage = document.getElementById('sidebar-image');
            if (sidebarImage) sidebarImage.dataset.addChildMode = "false";
        } else {
            statusEl.innerText = "Başarılı! Sayfayı yenileyin.";
            statusEl.style.color = "green";
            alert("Çocuk eklendi. Lütfen sayfayı yenileyin.");
        }

        const sidebarImage = document.getElementById('sidebar-image');
        if (sidebarImage) sidebarImage.dataset.addChildMode = "false";

        setTimeout(() => {
            const sidebar = document.getElementById('family-sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }, 1000);

    } catch (e: any) {
        console.error(e);
        statusEl.innerText = "Hata: " + e.message;
        statusEl.style.color = "red";
    }
}

export async function submitNewSpouse(node: D3Node) {
    const statusEl = document.getElementById('add-status');
    if (!statusEl) return;

    // 1. Collect Data
    const inputs = document.querySelectorAll('#sidebar-details input.sidebar-input, #sidebar-details select.sidebar-input');
    const updates: any = {};
    let hasName = false;

    inputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        const val = (inp as HTMLInputElement).value;
        if (val && key) {
            if (key === 'first_name') hasName = true;
            const colIndex = COLUMN_MAPPING[key];
            if (colIndex) updates[colIndex] = val;
        }
    });

    if (!hasName) {
        alert("Lütfen en azından bir isim (Ad) girin.");
        return;
    }

    const familyData = store.getState().familyData;
    if (!familyData || !familyData.members) {
        alert("Veri yüklenemedi.");
        return;
    }

    // Build Row Map
    const rowMap = new Map<number, any>();
    Object.values(familyData.members).forEach((m: any) => {
        if (m.row_index) rowMap.set(m.row_index, m);
    });

    const clickedMemberData = (node.added_data as any).input;
    if (!clickedMemberData || !clickedMemberData.row_index) {
        alert("Seçilen kişi için satır verisi bulunamadı.");
        return;
    }

    const anchorRow = clickedMemberData.row_index;

    // 2. Calculate Insertion Point
    let insertAfterRow = anchorRow;
    let checkRow = anchorRow + 1;

    while (true) {
        const nextMem = rowMap.get(checkRow);
        if (!nextMem) break;

        if (nextMem.is_spouse) {
            insertAfterRow = checkRow;
            checkRow++;
            continue;
        }
        break;
    }

    const targetRow = insertAfterRow + 1;

    // 3. Add System Fields to Updates
    updates[COLUMN_MAPPING['gen_col']] = "E";
    updates[COLUMN_MAPPING['father']] = "";
    updates[COLUMN_MAPPING['mother']] = "";
    updates[COLUMN_MAPPING['note']] = (updates[COLUMN_MAPPING['note']] ? updates[COLUMN_MAPPING['note']] + ", " : "") + "is_spouse:true";

    // 4. Send Request
    statusEl.innerText = "Ekleniyor...";
    statusEl.style.color = "orange";

    try {
        const payload = {
            action: "addSpouse",
            row: targetRow,
            updates: updates
        };

        await fetch(UPLOAD_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        statusEl.innerText = "Eş eklendi!";
        statusEl.style.color = "green";

        const imageEl = document.getElementById('sidebar-image');
        const isAddSpouseMode = imageEl && imageEl.dataset.addSpouseMode === "true";

        if (isAddSpouseMode && pendingChildPhoto) {
            statusEl.innerText = "Eş eklendi! Fotoğraf yükleniyor...";
            statusEl.style.color = "orange";

            try {
                const newSpouseRow = targetRow + 1;
                const tempNode: any = {
                    data: "temp_spouse",
                    added_data: {
                        input: { row_index: newSpouseRow }
                    }
                };

                await uploadPhoto(pendingChildPhoto, tempNode);

                statusEl.innerText = "Başarılı! Fotoğraf yüklendi. Sayfayı yenileyin.";
                statusEl.style.color = "green";
                alert("Eş ve fotoğraf eklendi. Lütfen sayfayı yenileyin.");

            } catch (photoError: any) {
                console.error("Photo upload error:", photoError);
                statusEl.innerText = "Eş eklendi ama fotoğraf yüklenemedi. Sayfayı yenileyip tekrar deneyin.";
                statusEl.style.color = "orange";
                alert("Eş eklendi ama fotoğraf yüklenemedi. Lütfen sayfayı yenileyip fotoğrafı tekrar ekleyin.");
            }
            setPendingChildPhoto(null);
            if (imageEl) imageEl.dataset.addSpouseMode = "false";
        } else {
            statusEl.innerText = "Başarılı! Sayfayı yenileyin.";
            statusEl.style.color = "green";
            alert("Eş eklendi. Lütfen sayfayı yenileyin.");
        }

        if (imageEl) imageEl.dataset.addSpouseMode = "false";

        setTimeout(() => {
            const sidebar = document.getElementById('family-sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }, 1000);

    } catch (e: any) {
        console.error(e);
        statusEl.innerText = "Hata: " + e.message;
        statusEl.style.color = "red";
    }
}

export async function deleteChild(node: D3Node) {
    const name = get_name(node) || "Bu kişi";
    const confirmDelete = confirm(`${name} isimli kişiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`);

    if (!confirmDelete) return;

    try {
        const memberData = (node.added_data as any).input;
        let sheetRow: number;

        if (memberData && memberData.row_index) {
            sheetRow = memberData.row_index;
        } else if (node.data.startsWith("mem_")) {
            const memberId = parseInt(node.data.split("_")[1]);
            sheetRow = memberId + 2;
        } else {
            throw new Error("Satır numarası bulunamadı.");
        }

        const statusEl = document.getElementById('save-status');
        if (statusEl) {
            statusEl.innerText = "Siliniyor...";
            statusEl.style.color = "orange";
        }

        const payload = {
            action: "deleteRow",
            row: sheetRow
        };

        await fetch(UPLOAD_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        if (statusEl) {
            statusEl.innerText = "Silindi! Sayfayı yenileyin.";
            statusEl.style.color = "green";
        }
        alert("Kişi silindi. Lütfen sayfayı yenileyin.");

        setTimeout(() => {
            const sidebar = document.getElementById('family-sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }, 1000);

    } catch (e: any) {
        console.error(e);
        const statusEl = document.getElementById('save-status');
        if (statusEl) {
            statusEl.innerText = "Hata: " + e.message;
            statusEl.style.color = "red";
        }
    }
}

export async function submitMoveChild(node: D3Node, newParentId: string, newSpouseName: string) {
    const statusEl = document.getElementById('move-status');
    if (statusEl) {
        statusEl.innerText = "Taşınıyor...";
        statusEl.style.color = "orange";
    }

    const familyData = store.getState().familyData;
    const newParent = familyData?.members[newParentId];

    if (!newParent) {
        alert("Seçilen ebeveyn bulunamadı.");
        return;
    }

    const updates: any = {};

    if (newParent.gender === 'K') {
        updates[COLUMN_MAPPING['mother']] = newParent.first_name;
        updates[COLUMN_MAPPING['father']] = newSpouseName || "";
    } else {
        updates[COLUMN_MAPPING['father']] = newParent.first_name;
        updates[COLUMN_MAPPING['mother']] = newSpouseName || "";
    }

    try {
        await saveData(node, updates);

        if (statusEl) {
            statusEl.innerText = "Başarıyla taşındı! Sayfayı yenileyin.";
            statusEl.style.color = "green";
        }
        alert("Kişi taşındı. Lütfen sayfayı yenileyin.");

        setTimeout(() => {
            const sidebar = document.getElementById('family-sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }, 1000);

    } catch (e: any) {
        console.error(e);
        if (statusEl) {
            statusEl.innerText = "Hata: " + e.message;
            statusEl.style.color = "red";
        }
    }
}
